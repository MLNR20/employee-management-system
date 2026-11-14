/**
 * Works out what an administrator may do from the roles they hold. Only active roles count, and a
 * permission is any "<module>:<action>" a role lists (see domain/role/permissions.js).
 *
 * @param {Object} deps
 * @param {import("../../domain/role/RoleAssignmentRepository").RoleAssignmentRepository} deps.roleAssignmentRepository
 * @param {import("../../domain/role/RoleRepository").RoleRepository} deps.roleRepository
 */
export const createAuthorizationUseCases = ({ roleAssignmentRepository, roleRepository }) => {
  /**
   * The role names and the combined permissions of an administrator's active roles, both sorted.
   * This is what goes into their access token.
   * @returns {Promise<{roles: string[], permissions: string[]}>}
   */
  const accessFor = async (administratorId) => {
    const assignments = await roleAssignmentRepository.findByAdministratorId(administratorId);
    const roles = new Set();
    const permissions = new Set();

    for (const { roleId } of assignments) {
      const role = await roleRepository.findById(roleId);
      if (!role || role.isActive === false) continue;
      roles.add(role.name);
      (role.permissions ?? []).forEach((permission) => permissions.add(permission));
    }
    return { roles: [...roles].sort(), permissions: [...permissions].sort() };
  };

  return {
    accessFor,

    /** Looks the roles up fresh, so it reflects changes made since the token was issued. */
    async hasPermission(administratorId, permission) {
      return (await accessFor(administratorId)).permissions.includes(permission);
    },
  };
};
