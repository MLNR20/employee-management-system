// The development accounts: admin has everything, user cannot touch HR; seeding twice changes nothing.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createSeedAccounts } from "../src/application/auth/seedAccountsUseCase.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { DEFAULT_ACCOUNTS } from "../src/domain/role/defaultAccounts.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  InMemoryAdministratorRepository,
  InMemoryRoleAssignmentRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

const setup = () => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const passwordHasher = new BcryptPasswordHasher(4);

  return {
    administratorRepository,
    roleRepository,
    roleAssignmentRepository,
    seed: () =>
      createSeedAccounts({ administratorRepository, roleRepository, roleAssignmentRepository, passwordHasher })(DEFAULT_ACCOUNTS),
    auth: createAuthUseCases({
      administratorRepository,
      passwordHasher,
      tokenService: new JwtTokenService({ accessSecret: "a", refreshSecret: "r", accessTtl: "15m", refreshTtl: "7d" }),
    }),
    authorization: createAuthorizationUseCases({ roleAssignmentRepository, roleRepository }),
  };
};

test("both accounts can sign in with their email and password", async () => {
  const { seed, auth } = setup();
  await seed();

  assert.ok((await auth.login({ username: "admin@ga31.com", password: "admin123" })).accessToken);
  assert.ok((await auth.login({ username: "user@ga31.com", password: "user123" })).accessToken);
  await assert.rejects(auth.login({ username: "user@ga31.com", password: "admin123" }));
});

test("the admin holds every permission and the user is kept away from HR", async () => {
  const { seed, administratorRepository, authorization } = setup();
  await seed();
  const admin = await administratorRepository.findByUsername("admin@ga31.com");
  const user = await administratorRepository.findByUsername("user@ga31.com");

  assert.equal(await authorization.hasPermission(admin.id, "salary-rates:assign"), true);
  assert.equal(await authorization.hasPermission(admin.id, "roles:delete"), true);

  assert.equal(await authorization.hasPermission(user.id, "employees:view"), true);
  assert.equal(await authorization.hasPermission(user.id, "attendance:create"), true);
  for (const denied of ["salary-rates:assign", "salary-rates:view", "roles:edit", "audit-logs:view", "employees:delete"]) {
    assert.equal(await authorization.hasPermission(user.id, denied), false, denied);
  }
});

test("seeding again creates nothing and leaves a changed password alone", async () => {
  const { seed, administratorRepository, roleRepository, roleAssignmentRepository } = setup();
  const first = await seed();
  assert.ok(first.every((row) => row.createdAccount && row.createdRole));

  const before = await administratorRepository.findByUsername("user@ga31.com");
  const second = await seed();

  assert.ok(second.every((row) => !row.createdAccount && !row.createdRole));
  assert.equal((await administratorRepository.findAll()).length, 2);
  assert.equal((await roleRepository.findAll()).length, 2);
  assert.equal((await roleAssignmentRepository.findAll()).length, 2);
  assert.equal((await administratorRepository.findByUsername("user@ga31.com")).passwordHash, before.passwordHash);
});
