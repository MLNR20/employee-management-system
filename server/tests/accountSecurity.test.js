// Keeping access recoverable and credentials safe: the first administrator gets access, passwords can
// be changed and reset, and no publicly known token secret is ever used.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createAdministratorUseCases } from "../src/application/administrator/administratorUseCases.js";
import { createEmployeeAuthUseCases } from "../src/application/employee/employeeAuthUseCases.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createAccessUseCases } from "../src/application/role/accessUseCases.js";
import { createAdminRouter } from "../src/presentation/http/routes/adminRoutes.js";
import { createAdministratorListRouter } from "../src/presentation/http/routes/hrRoutes.js";
import { createEmployeePortalRouter } from "../src/presentation/http/routes/employeePortalRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { describeRequest } from "../src/domain/audit/auditRules.js";
import { ALL_PERMISSIONS } from "../src/domain/role/permissions.js";
import { resolveSecrets, SECRET_NAMES } from "../src/infrastructure/config/secrets.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  InMemoryAdministratorRepository,
  InMemoryRoleAssignmentRepository,
  createInMemoryEmployeeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

const passwordHasher = new BcryptPasswordHasher(4);
const tokens = () =>
  new JwtTokenService({ accessSecret: "a1", refreshSecret: "r1", accessTtl: "15m", refreshTtl: "7d" });

const setup = ({ preferred } = {}) => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const authorizationUseCases = createAuthorizationUseCases({ roleAssignmentRepository, roleRepository });
  const accessUseCases = createAccessUseCases({
    administratorRepository,
    roleRepository,
    roleAssignmentRepository,
    authorizationUseCases,
    preferred,
  });
  const authUseCases = createAuthUseCases({
    administratorRepository,
    passwordHasher,
    tokenService: tokens(),
    accessResolver: authorizationUseCases,
    onSeeded: () => accessUseCases.ensureAccessManager(),
    seedAdministrator: {
      username: "first",
      password: "first-pass-1",
      first_name: "First",
      last_name: "Admin",
      email: "first@example.com",
    },
  });
  const addAdmin = async (username, extra = {}) =>
    administratorRepository.create({
      username,
      first_name: username,
      last_name: "Admin",
      email: `${username}@example.com`,
      passwordHash: await passwordHasher.hash(`${username}-pass-1`),
      isActive: true,
      ...extra,
    });
  const permissions = (admin) => authorizationUseCases.permissionsFor(admin.id);

  return {
    administratorRepository,
    roleRepository,
    roleAssignmentRepository,
    accessUseCases,
    authUseCases,
    addAdmin,
    permissions,
  };
};

// --- Somebody can always manage access ------------------------------------------------------------

test("the first administrator created from configuration can sign in with full access", async () => {
  const { authUseCases, administratorRepository, permissions } = setup();
  await authUseCases.ensureAdministratorsExist();

  const first = await administratorRepository.findByUsername("first");
  assert.deepEqual((await permissions(first)).sort(), [...ALL_PERMISSIONS].sort());
});

test("when nobody can manage access, the configured administrator is given it, once", async () => {
  const { accessUseCases, addAdmin, permissions, roleAssignmentRepository } = setup({
    preferred: { email: "SECOND@example.com" },
  });
  const older = await addAdmin("older");
  const second = await addAdmin("second");

  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: "second" });
  assert.equal((await permissions(second)).length, ALL_PERMISSIONS.length);
  assert.deepEqual(await permissions(older), [], "nobody else is given anything");

  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: null });
  assert.equal((await roleAssignmentRepository.findAll()).length, 1);
});

test("without a configured match the oldest active administrator is chosen", async () => {
  const { accessUseCases, addAdmin } = setup();
  await addAdmin("gone", { isActive: false });
  await addAdmin("oldest");
  await addAdmin("newer");
  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: "oldest" });
});

test("an Administrator role that fell short is topped up, and one that can manage access is left alone", async () => {
  const { accessUseCases, addAdmin, roleRepository, roleAssignmentRepository, permissions } = setup();
  const admin = await addAdmin("only");
  const role = await roleRepository.create({ name: "Administrator", permissions: ["employees:view"], isActive: false });
  await roleAssignmentRepository.create({ administratorId: admin.id, roleId: role.id });

  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: "only" });
  assert.equal((await permissions(admin)).length, ALL_PERMISSIONS.length);
  assert.equal((await roleAssignmentRepository.findAll()).length, 1);

  // A narrower role is enough as long as its holder can manage access: nothing is changed.
  await roleRepository.update(role.id, { permissions: ["roles:edit", "role-assignments:create"] });
  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: null });
  assert.equal((await permissions(admin)).length, 2);
});

test("access can be granted by username, and an empty database is left alone", async () => {
  const { accessUseCases, addAdmin, permissions } = setup();
  assert.deepEqual(await accessUseCases.ensureAccessManager(), { granted: null });
  await assert.rejects(accessUseCases.grantFullAccess("nobody"), /no administrator called/);

  await addAdmin("boss");
  const clerk = await addAdmin("clerk");
  await accessUseCases.grantFullAccess("clerk");
  assert.equal((await permissions(clerk)).length, ALL_PERMISSIONS.length);
});

// --- Passwords --------------------------------------------------------------------------------------

const serve = async (mount) => {
  const app = express();
  app.use(express.json());
  mount(app);
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const call = async (path, body, as) => {
    const response = await fetch(`http://localhost:${server.address().port}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(as ? { "x-user": as } : {}) },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  return { call, close: () => server.close() };
};
const signedIn = (req, res, next) => {
  if (!req.headers["x-user"]) return res.status(401).json({ message: "Sign in" });
  req.user = { id: req.headers["x-user"] };
  next();
};

test("administrators change their own password and reset each other's, ending sessions", async () => {
  const { authUseCases, administratorRepository, addAdmin } = setup();
  const ana = await addAdmin("ana");
  const ben = await addAdmin("ben");
  const administratorUseCases = createAdministratorUseCases({ administratorRepository, passwordHasher });
  const { call, close } = await serve((app) => {
    app.use("/admin", createAdminRouter({ authUseCases, requireAuth: signedIn }));
    app.use("/administrators", createAdministratorListRouter({ administratorUseCases, requireAuth: signedIn }));
  });
  const signIn = (username, password) => authUseCases.login({ username, password });

  try {
    const { refreshToken } = await signIn("ana", "ana-pass-1");
    const change = (body, as = ana.id) => call("/admin/password", body, as);

    assert.equal((await change({ currentPassword: "ana-pass-1", newPassword: "next-pass-1" }, null)).status, 401);
    const wrong = await change({ currentPassword: "guess-pass-1", newPassword: "next-pass-1" });
    assert.equal(wrong.status, 400);
    assert.match(wrong.body.message, /current password is incorrect/);
    assert.equal((await change({ currentPassword: "ana-pass-1", newPassword: "short" })).status, 400);
    assert.equal((await change({ currentPassword: "ana-pass-1", newPassword: "ana-pass-1" })).status, 400);
    assert.equal((await change({ newPassword: "next-pass-1" })).status, 400);
    assert.equal((await change({ currentPassword: { $ne: null }, newPassword: "next-pass-1" })).status, 400);

    assert.equal((await change({ currentPassword: "ana-pass-1", newPassword: "next-pass-1" })).status, 204);
    await assert.rejects(signIn("ana", "ana-pass-1"));
    await assert.rejects(authUseCases.refreshSession({ refreshToken }), "the open session cannot be renewed");
    const session = await signIn("ana", "next-pass-1");

    // Ben resets Ana's password. Nobody can reset their own without the current one.
    const reset = (id, newPassword, as = ben.id) => call(`/administrators/${id}/password`, { newPassword }, as);
    assert.equal((await reset(ben.id, "other-pass-1")).status, 400);
    assert.equal((await reset(ana.id, "short")).status, 400);
    assert.equal((await reset("000000000000000000000fff", "reset-pass-1")).status, 404);
    assert.equal((await reset(ana.id, "reset-pass-1")).status, 204);
    await assert.rejects(authUseCases.refreshSession({ refreshToken: session.refreshToken }));
    await signIn("ana", "reset-pass-1");
  } finally {
    close();
  }
});

test("a new administrator account needs a password of a sensible length", async () => {
  const { authUseCases } = setup();
  const account = { username: "new", first_name: "N", last_name: "A", email: "new@example.com" };
  await assert.rejects(authUseCases.register({ ...account, password: "short" }), /8 to 72/);
  await assert.rejects(authUseCases.register({ ...account, password: "x".repeat(73) }), /8 to 72/);
});

test("an employee changes their own portal password", async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com" });
  await employeeRepository.setPassword(employee.id, await passwordHasher.hash("old-pass-12"));
  const employeeAuthUseCases = createEmployeeAuthUseCases({ employeeRepository, passwordHasher, tokenService: tokens() });
  const { call, close } = await serve((app) =>
    app.use("/employee-portal", createEmployeePortalRouter({ employeeAuthUseCases, requireEmployeeAuth: signedIn }))
  );
  const change = (body, as = employee.id) => call("/employee-portal/password", body, as);

  try {
    assert.equal((await change({ currentPassword: "old-pass-12", newPassword: "new-pass-12" }, null)).status, 401);
    assert.equal((await change({ currentPassword: "wrong-pass", newPassword: "new-pass-12" })).status, 400);
    assert.equal((await change({ currentPassword: "old-pass-12", newPassword: "short" })).status, 400);
    // An id in the body never picks someone else.
    assert.equal(
      (await change({ employeeId: "other", currentPassword: "old-pass-12", newPassword: "new-pass-12" })).status,
      204
    );
    await assert.rejects(employeeAuthUseCases.login({ email: "ann@example.com", password: "old-pass-12" }));
    await employeeAuthUseCases.login({ email: "ann@example.com", password: "new-pass-12" });
  } finally {
    close();
  }
});

test("password changes are audited by name", () => {
  const describe = (url) => describeRequest({ method: "POST", url, status: 204 });
  assert.equal(describe("/admin/password").action, "password_change");
  assert.equal(describe("/employee-portal/password").action, "password_change");
  assert.equal(describe("/administrators/000000000000000000000001/password").action, "password");
});

// --- Token secrets ----------------------------------------------------------------------------------

test("secrets that are set and distinct are used as they are, with no warning", () => {
  const env = { JWT_SECRET: "one", REFRESH_TOKEN_SECRET: "two", EMPLOYEE_JWT_SECRET: "three" };
  const warnings = [];
  assert.deepEqual(resolveSecrets(env, (m) => warnings.push(m)), env);
  assert.deepEqual(warnings, []);
});

test("a missing, published or repeated secret is replaced by a random one, with a warning", () => {
  const warnings = [];
  const secrets = resolveSecrets({ REFRESH_TOKEN_SECRET: "secret123", EMPLOYEE_JWT_SECRET: "  " }, (m) => warnings.push(m));
  for (const name of SECRET_NAMES) assert.ok(secrets[name].length >= 40, name);
  assert.equal(new Set(Object.values(secrets)).size, 3);
  assert.equal(warnings.length, 1);
  for (const name of SECRET_NAMES) assert.match(warnings[0], new RegExp(name));
  assert.notEqual(resolveSecrets({}, () => {}).JWT_SECRET, resolveSecrets({}, () => {}).JWT_SECRET);

  const repeated = resolveSecrets({ JWT_SECRET: "same", REFRESH_TOKEN_SECRET: "same", EMPLOYEE_JWT_SECRET: "x" }, () => {});
  assert.equal(repeated.JWT_SECRET, "same");
  assert.notEqual(repeated.REFRESH_TOKEN_SECRET, "same");
});
