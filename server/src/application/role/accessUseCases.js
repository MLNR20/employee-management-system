import { NotFoundError } from "../../domain/errors.js";
import { ALL_PERMISSIONS } from "../../domain/role/permissions.js";

export const FULL_ACCESS_ROLE = "Administrator";

// Whoever holds both of these can give themselves, or anyone else, whatever is missing.
const MANAGES_ACCESS = ["roles:edit", "role-assignments:create"];

/**
 * Makes sure somebody can always manage who has access. Permissions are enforced, so without this a
 * new install (or one whose administrators never had roles) would have nobody able to grant any.
 *
 * @param {Object} deps
 * @param {import("../../domain/administrator/AdministratorRepository").AdministratorRepository} deps.administratorRepository
 * @param {import("../../domain/role/RoleRepository").RoleRepository} deps.roleRepository
 * @param {import("../../domain/role/RoleAssignmentRepository").RoleAssignmentRepository} deps.roleAssignmentRepository
 * @param {{permissionsFor: (administratorId: string) => Promise<string[]>}} deps.authorizationUseCases
 * @param {{username?: string, email?: string}} [deps.preferred] the configured first administrator, chosen
 *   over the others when someone has to be given access
 */
export const createAccessUseCases = ({
  administratorRepository,
  roleRepository,
  roleAssignmentRepository,
  authorizationUseCases,
  preferred = {},
}) => {
  /** The "Administrator" role, created or brought up to every permission. */
  const fullAccessRole = async () => {
    const existing = (await roleRepository.findAll()).find((role) => role.name === FULL_ACCESS_ROLE);
    if (!existing) {
      return roleRepository.create({
        name: FULL_ACCESS_ROLE,
        description: "Full access",
        permissions: ALL_PERMISSIONS,
      });
    }
    const permissions = [...new Set([...(existing.permissions ?? []), ...ALL_PERMISSIONS])];
    return roleRepository.update(existing.id, { permissions, isActive: true });
  };

  const grant = async (administratorId) => {
    const role = await fullAccessRole();
    const held = await roleAssignmentRepository.findByAdministratorId(administratorId);
    if (!held.some((assignment) => assignment.roleId === role.id)) {
      await roleAssignmentRepository.create({ administratorId, roleId: role.id });
    }
  };

  const canManageAccess = async (administratorId) => {
    const permissions = await authorizationUseCases.permissionsFor(administratorId);
    return MANAGES_ACCESS.every((permission) => permissions.includes(permission));
  };

  return {
    /** Gives one administrator the full-access role, by sign-in name. */
    async grantFullAccess(username) {
      const administrator = await administratorRepository.findByUsername(username);
      if (!administrator) throw new NotFoundError(`There is no administrator called "${username}"`);
      await grant(administrator.id);
      return administrator;
    },

    /**
     * When no active administrator can manage access, gives full access to the configured first
     * administrator, or else the oldest one. Otherwise changes nothing.
     * @returns {Promise<{granted: string | null}>} the username that was given access
     */
    async ensureAccessManager() {
      const active = (await administratorRepository.findAll()).filter((admin) => admin.isActive !== false);
      if (active.length === 0) return { granted: null };
      for (const admin of active) {
        if (await canManageAccess(admin.id)) return { granted: null };
      }

      const email = preferred.email?.trim().toLowerCase();
      const oldestFirst = [...active].sort(
        (a, b) => new Date(a.dateCreated ?? 0) - new Date(b.dateCreated ?? 0) || String(a.id).localeCompare(String(b.id))
      );
      const chosen =
        (email && oldestFirst.find((admin) => admin.email?.toLowerCase() === email)) ||
        oldestFirst.find((admin) => admin.username === preferred.username) ||
        oldestFirst[0];

      await grant(chosen.id);
      return { granted: chosen.username };
    },
  };
};
