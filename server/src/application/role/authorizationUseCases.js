/**
 * Answers "may this administrator do this?" from the roles they hold. A permission is granted when
 * any of their active roles lists it ("<module>:<action>", see domain/role/permissions.js).
 *
 * @param {Object} deps
 * @param {import("../../domain/role/RoleAssignmentRepository").RoleAssignmentRepository} deps.roleAssignmentRepository
 * @param {import("../../domain/role/RoleRepository").RoleRepository} deps.roleRepository
 */
export const createAuthorizationUseCases = ({ roleAssignmentRepository, roleRepository }) => ({
  async hasPermission(administratorId, permission) {
    const assignments = await roleAssignmentRepository.findByAdministratorId(administratorId);

    for (const { roleId } of assignments) {
      const role = await roleRepository.findById(roleId);
      if (role && role.isActive !== false && role.permissions?.includes(permission)) return true;
    }
    return false;
  },
});
