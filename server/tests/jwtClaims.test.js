// The access token carries the administrator's roles and permissions, and the HR check reads them.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import jwt from "jsonwebtoken";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createSalaryRateUseCases } from "../src/application/salary/salaryRateUseCases.js";
import { createSalaryRateRouter } from "../src/presentation/http/routes/salaryRateRoutes.js";
import { createAuthMiddleware } from "../src/presentation/http/middleware/authMiddleware.js";
import { createRequirePermission } from "../src/presentation/http/middleware/permissionMiddleware.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  InMemoryAdministratorRepository,
  InMemoryRoleAssignmentRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

const ACCESS_SECRET = "claims-access";

const setup = async ({ withResolver = true } = {}) => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const authorization = createAuthorizationUseCases({ roleAssignmentRepository, roleRepository });
  const auth = createAuthUseCases({
    administratorRepository,
    passwordHasher: new BcryptPasswordHasher(4),
    tokenService: new JwtTokenService({
      accessSecret: ACCESS_SECRET,
      refreshSecret: "claims-refresh",
      accessTtl: "15m",
      refreshTtl: "7d",
    }),
    accessResolver: withResolver ? authorization : undefined,
  });

  const register = async (username) => {
    const admin = await auth.register({
      username,
      password: "pass-word1!",
      first_name: username,
      last_name: "Test",
      email: `${username}@example.com`,
    });
    return admin.id;
  };
  const grant = async (administratorId, role) => {
    const stored = await roleRepository.create(role);
    await roleAssignmentRepository.create({ administratorId, roleId: stored.id });
    return stored;
  };
  const login = (username) => auth.login({ username, password: "pass-word1!" });
  const claims = (token) => jwt.verify(token, ACCESS_SECRET);

  return { auth, authorization, roleRepository, register, grant, login, claims, administratorRepository };
};

test("the access token lists the administrator's active roles and their combined permissions", async () => {
  const { register, grant, login, claims } = await setup();
  const id = await register("hana");
  await grant(id, { name: "HR", permissions: ["salary-rates:view", "salary-rates:assign", "employees:view"] });
  await grant(id, { name: "Auditor", permissions: ["audit-logs:view", "employees:view"] });
  await grant(id, { name: "Retired", isActive: false, permissions: ["roles:delete"] });

  const token = claims((await login("hana")).accessToken);

  assert.deepEqual(token.roles, ["Auditor", "HR"], "sorted, and the inactive role is left out");
  assert.deepEqual(token.permissions, [
    "audit-logs:view",
    "employees:view", // shared by two roles, listed once
    "salary-rates:assign",
    "salary-rates:view",
  ]);
  assert.equal(token.id, id);
  assert.equal(token.username, "hana");
  assert.ok(token.exp > token.iat, "still an expiring token");
  assert.ok(!JSON.stringify(token).includes("passwordHash"));
});

test("an administrator with no role gets empty lists, and without a resolver tokens carry none", async () => {
  const bare = await setup();
  await bare.register("nora");
  const empty = bare.claims((await bare.login("nora")).accessToken);
  assert.deepEqual(empty.roles, []);
  assert.deepEqual(empty.permissions, []);

  const unresolved = await setup({ withResolver: false });
  const id = await unresolved.register("omar");
  await unresolved.grant(id, { name: "HR", permissions: ["salary-rates:assign"] });
  const none = unresolved.claims((await unresolved.login("omar")).accessToken);
  assert.deepEqual(none.permissions, []);
});

test("authenticate returns the claims, and a refresh re-reads the roles", async () => {
  const { auth, register, grant, login, claims, roleRepository } = await setup();
  const id = await register("ivy");
  const role = await grant(id, { name: "Clerk", permissions: ["employees:view"] });

  const first = await login("ivy");
  assert.deepEqual(auth.authenticate(first.accessToken).permissions, ["employees:view"]);

  // HR changes the role. The token already issued keeps its claims; the next renewal picks the change up.
  await roleRepository.update(role.id, { permissions: ["employees:view", "salary-rates:assign"] });
  assert.deepEqual(claims(first.accessToken).permissions, ["employees:view"]);

  const renewed = await auth.refreshSession({ refreshToken: first.refreshToken });
  assert.deepEqual(claims(renewed.accessToken).permissions, ["employees:view", "salary-rates:assign"]);

  // Deactivating the role empties the claims at the following renewal.
  await roleRepository.update(role.id, { isActive: false });
  const again = await auth.refreshSession({ refreshToken: renewed.refreshToken });
  assert.deepEqual(claims(again.accessToken).roles, []);
  assert.deepEqual(claims(again.accessToken).permissions, []);
});

test("the permission check reads the token, and only asks the stored roles about older tokens", async () => {
  const lookups = [];
  const requirePermission = createRequirePermission({
    hasPermission: async (id, permission) => {
      lookups.push([id, permission]);
      return permission === "salary-rates:view";
    },
  });

  const run = (user, permission) =>
    new Promise((resolve) => requirePermission(permission)({ user }, {}, (error) => resolve(error?.name ?? "allowed")));

  assert.equal(await run({ id: "1", permissions: ["salary-rates:assign"] }, "salary-rates:assign"), "allowed");
  assert.equal(await run({ id: "1", permissions: ["employees:view"] }, "salary-rates:assign"), "ForbiddenError");
  assert.equal(await run({ id: "1", permissions: [] }, "salary-rates:assign"), "ForbiddenError");
  assert.deepEqual(lookups, [], "a token with the claim never touches the database");

  // No permissions claim at all: a token from before roles were added. The stored roles decide.
  assert.equal(await run({ id: "2" }, "salary-rates:view"), "allowed");
  assert.equal(await run({ id: "2" }, "salary-rates:assign"), "ForbiddenError");
  assert.deepEqual(lookups, [["2", "salary-rates:view"], ["2", "salary-rates:assign"]]);
});

test("end to end: only a token whose roles grant the permission can assign a rate", async () => {
  const { auth, authorization, register, grant, login, roleRepository } = await setup();
  const employees = createInMemoryEmployeeRepository();
  const employee = await employees.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com", salary: 1000 });

  const app = express();
  app.use(express.json());
  app.use(
    "/salary-rates",
    createSalaryRateRouter({
      salaryRateUseCases: createSalaryRateUseCases({ salaryRateRepository: new InMemorySalaryRateRepository(), employeeRepository: employees }),
      requireAuth: createAuthMiddleware(auth),
      requirePermission: createRequirePermission(authorization),
    })
  );
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });

  try {
    const post = async (token) =>
      (
        await fetch(`http://localhost:${server.address().port}/salary-rates/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ employeeId: employee.id, hourlyRate: 120 }),
        })
      ).status;

    const hr = await register("hr");
    const hrRole = await grant(hr, { name: "HR", permissions: ["salary-rates:assign"] });
    const clerk = await register("clerk");
    await grant(clerk, { name: "Clerk", permissions: ["employees:view"] });

    const hrToken = (await login("hr")).accessToken;
    assert.equal(await post(hrToken), 200);
    assert.equal(await post((await login("clerk")).accessToken), 403);

    // The token is a snapshot: taking the permission away does not cut off a token already issued,
    // but the next one issued no longer has it.
    await roleRepository.update(hrRole.id, { permissions: [] });
    assert.equal(await post(hrToken), 200, "old token keeps working until it expires or is renewed");
    assert.equal(await post((await login("hr")).accessToken), 403);
  } finally {
    server.close();
  }
});
