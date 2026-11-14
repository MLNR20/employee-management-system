/**
 * Makes sure each account exists as an administrator holding its role, creating whatever is missing.
 * Safe to run again: an account that already exists keeps its password, and a role that already
 * exists keeps the permissions it has been given since.
 *
 * @param {Object} deps
 * @param {import("../../domain/administrator/AdministratorRepository").AdministratorRepository} deps.administratorRepository
 * @param {import("../../domain/role/RoleRepository").RoleRepository} deps.roleRepository
 * @param {import("../../domain/role/RoleAssignmentRepository").RoleAssignmentRepository} deps.roleAssignmentRepository
 * @param {import("../ports/PasswordHasher").PasswordHasher} deps.passwordHasher
 * @returns {(accounts: Array<{username: string, password: string, first_name: string, last_name: string, email: string, role: {name: string, description?: string, permissions: string[]}}>) => Promise<Array<{username: string, role: string, createdAccount: boolean, createdRole: boolean}>>}
 */
export const createSeedAccounts =
  ({ administratorRepository, roleRepository, roleAssignmentRepository, passwordHasher }) =>
  async (accounts) => {
    const report = [];

    for (const { password, role: wanted, ...profile } of accounts) {
      let role = (await roleRepository.findAll()).find((existing) => existing.name === wanted.name);
      const createdRole = !role;
      if (!role) role = await roleRepository.create(wanted);

      let admin = await administratorRepository.findByUsername(profile.username);
      const createdAccount = !admin;
      if (!admin) {
        admin = await administratorRepository.create({ ...profile, passwordHash: await passwordHasher.hash(password) });
      }

      const held = await roleAssignmentRepository.findByAdministratorId(admin.id);
      if (!held.some((assignment) => assignment.roleId === role.id)) {
        await roleAssignmentRepository.create({ administratorId: admin.id, roleId: role.id });
      }

      report.push({ username: profile.username, role: wanted.name, createdAccount, createdRole });
    }

    return report;
  };
