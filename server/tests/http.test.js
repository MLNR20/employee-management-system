// Drives the real Express app (routes, middleware, error mapping) over HTTP,
// with in-memory repositories standing in for MongoDB.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/presentation/http/app.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import { createDepartmentUseCases } from "../src/application/department/departmentUseCases.js";
import { createAdministratorUseCases } from "../src/application/administrator/administratorUseCases.js";
import { createLeaveTypeUseCases } from "../src/application/leave/leaveTypeUseCases.js";
import {
  createRoleUseCases,
  createRoleAssignmentUseCases,
} from "../src/application/role/roleUseCases.js";
import { createLeaveBalanceUseCases } from "../src/application/leave/leaveBalanceUseCases.js";
import { createLeaveRequestUseCases } from "../src/application/leave/leaveRequestUseCases.js";
import { createAuditLogUseCases } from "../src/application/audit/auditLogUseCases.js";
import { createInventoryUseCases } from "../src/application/inventory/inventoryUseCases.js";
import { createDashboardUseCases } from "../src/application/dashboard/dashboardUseCases.js";
import { createBorrowingUseCases } from "../src/application/inventory/borrowingUseCases.js";
import { createEmployeeAuthUseCases } from "../src/application/employee/employeeAuthUseCases.js";
import {
  InMemoryAdministratorRepository,
  InMemoryAuditLogRepository,
  InMemoryBorrowingRepository,
  InMemoryInventoryRepository,
  InMemoryLeaveApprovalRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  InMemoryRoleAssignmentRepository,
  createInMemoryEmployeeRepository,
  createInMemoryDepartmentRepository,
  createInMemoryLeaveTypeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

let server;
let base;

before(async () => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();

  const authUseCases = createAuthUseCases({
    administratorRepository,
    passwordHasher: new BcryptPasswordHasher(4),
    tokenService: new JwtTokenService({
      accessSecret: "a",
      refreshSecret: "r",
      accessTtl: "15m",
      refreshTtl: "7d",
    }),
  });
  const employeeRepository = createInMemoryEmployeeRepository();
  const leaveTypeRepository = createInMemoryLeaveTypeRepository();
  const leaveBalanceRepository = new InMemoryLeaveBalanceRepository();
  const leaveRequestRepository = new InMemoryLeaveRequestRepository();

  const itemRepository = new InMemoryInventoryRepository();
  const employeeUseCases = createEmployeeUseCases({
    employeeRepository,
    leaveBalanceRepository,
    leaveRequestRepository,
    itemRepository,
    passwordHasher: new BcryptPasswordHasher(4),
  });
  const departmentUseCases = createDepartmentUseCases({
    departmentRepository: createInMemoryDepartmentRepository(),
  });

  const roleUseCases = createRoleUseCases({ roleRepository, roleAssignmentRepository });
  const roleAssignmentUseCases = createRoleAssignmentUseCases({
    roleAssignmentRepository,
    roleRepository,
    administratorRepository,
  });
  const leaveTypeUseCases = createLeaveTypeUseCases({
    leaveTypeRepository,
    leaveBalanceRepository,
    leaveRequestRepository,
  });
  const leaveBalanceUseCases = createLeaveBalanceUseCases({
    leaveBalanceRepository,
    employeeRepository,
    leaveTypeRepository,
  });
  const leaveRequestUseCases = createLeaveRequestUseCases({
    leaveRequestRepository,
    leaveApprovalRepository: new InMemoryLeaveApprovalRepository(),
    leaveBalanceRepository,
    employeeRepository,
    leaveTypeRepository,
    administratorRepository,
  });
  const administratorUseCases = createAdministratorUseCases({ administratorRepository });

  const app = createApp({
    authUseCases,
    employeeUseCases,
    departmentUseCases,
    roleUseCases,
    roleAssignmentUseCases,
    leaveTypeUseCases,
    leaveBalanceUseCases,
    leaveRequestUseCases,
    administratorUseCases,
    inventoryUseCases: createInventoryUseCases({ itemRepository, employeeRepository }),
    dashboardUseCases: createDashboardUseCases({ employeeRepository, leaveRequestRepository }),
    borrowingUseCases: createBorrowingUseCases({
      itemRepository,
      borrowingRepository: new InMemoryBorrowingRepository(),
      employeeRepository,
    }),
    employeeAuthUseCases: createEmployeeAuthUseCases({
      employeeRepository,
      passwordHasher: new BcryptPasswordHasher(4),
      tokenService: new JwtTokenService({
        accessSecret: "employee-a",
        refreshSecret: "employee-a",
        accessTtl: "15m",
        refreshTtl: "15m",
      }),
    }),
    auditLogUseCases: createAuditLogUseCases({ auditLogRepository: new InMemoryAuditLogRepository() }),
  });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, { body, token } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (error) {
    parsed = text; // e.g. Express's HTML page for a route that does not exist
  }
  return { status: response.status, body: parsed };
};

const alice = {
  username: "alice",
  password: "pass-word1!",
  first_name: "Alice",
  last_name: "Smith",
  email: "alice@example.com",
};

const employee = {
  first_name: "Ann",
  last_name: "Lee",
  email: "ann@example.com",
  position: "Accountant",
  department: "Finance and Accounting",
  salary: "5000",
  status: "false",
};

test("full session: register, login, use, refresh, logout", async () => {
  assert.equal((await call("POST", "/admin/register", { body: alice })).status, 200);

  const login = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  assert.equal(login.status, 200);
  assert.ok(login.body.token && login.body.refreshToken);

  const me = await call("GET", "/employees/protected", { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.user.first_name, "Alice");

  const refreshed = await call("POST", "/admin/refresh", {
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(refreshed.status, 200);
  assert.ok(refreshed.body.token);
  assert.notEqual(refreshed.body.refreshToken, login.body.refreshToken);

  const replay = await call("POST", "/admin/refresh", {
    body: { refreshToken: login.body.refreshToken },
  });
  assert.equal(replay.status, 401);

  // The replay ended the session, so even the newest token is dead.
  const afterReplay = await call("POST", "/admin/refresh", {
    body: { refreshToken: refreshed.body.refreshToken },
  });
  assert.equal(afterReplay.status, 401);

  const relogin = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  const logout = await call("POST", "/admin/logout", { body: { refreshToken: relogin.body.refreshToken } });
  assert.equal(logout.status, 204);
  const afterLogout = await call("POST", "/admin/refresh", {
    body: { refreshToken: relogin.body.refreshToken },
  });
  assert.equal(afterLogout.status, 401);
});

test("login failures are 400 and registering twice reports code 11000", async () => {
  const bad = await call("POST", "/admin/login", { body: { username: "alice", password: "wrong" } });
  assert.equal(bad.status, 400);

  const duplicate = await call("POST", "/admin/register", { body: alice });
  assert.equal(duplicate.status, 400);
  assert.equal(duplicate.body.code, 11000);

  const incomplete = await call("POST", "/admin/register", { body: { username: "x" } });
  assert.equal(incomplete.status, 400);
});

test("the admin list is no longer exposed", async () => {
  const response = await call("GET", "/admin/");
  assert.equal(response.status, 200);
  assert.ok(!Array.isArray(response.body));
  assert.ok(!JSON.stringify(response.body).includes("password"));
});

test("employee routes require a valid access token, with 401 and a code", async () => {
  const none = await call("GET", "/employees/");
  assert.equal(none.status, 401);

  const bad = await call("GET", "/employees/", { token: "garbage" });
  assert.equal(bad.status, 401);
  assert.equal(bad.body.code, "TOKEN_INVALID");
});

test("employee CRUD maps status to isActive and ids to _id", async () => {
  const { body: login } = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  const token = login.token;

  const created = await call("POST", "/employees/", { token, body: employee });
  assert.equal(created.status, 200);
  assert.ok(created.body._id);
  assert.equal(created.body.isActive, false); // `status: "false"` now actually persists

  const list = await call("GET", "/employees/", { token });
  assert.equal(list.body.count, 1);
  assert.equal(list.body.data[0]._id, created.body._id);

  const one = await call("GET", `/employees/${created.body._id}`, { token });
  assert.equal(one.body.email, "ann@example.com");

  const updated = await call("PUT", `/employees/${created.body._id}`, {
    token,
    body: { ...employee, status: "true", position: "Financial Analyst" },
  });
  assert.equal(updated.status, 200);
  const after = await call("GET", `/employees/${created.body._id}`, { token });
  assert.equal(after.body.position, "Financial Analyst");
  assert.equal(after.body.isActive, true);

  assert.equal((await call("POST", "/employees/", { token, body: employee })).status, 409);
  assert.equal((await call("POST", "/employees/", { token, body: { first_name: "x" } })).status, 400);

  assert.equal((await call("DELETE", `/employees/${created.body._id}`, { token })).status, 200);
  assert.equal((await call("GET", `/employees/${created.body._id}`, { token })).status, 404);
  assert.equal((await call("DELETE", `/employees/${created.body._id}`, { token })).status, 404);
});

test("department CRUD: validation, duplicates, base fields, 404s, auth", async () => {
  assert.equal((await call("GET", "/departments/")).status, 401);

  const { body: login } = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  const token = login.token;
  const finance = { name: "Finance", code: "fin", description: "Money matters" };

  const created = await call("POST", "/departments/", { token, body: finance });
  assert.equal(created.status, 200);
  assert.ok(created.body._id);
  assert.equal(created.body.isActive, true);
  assert.ok(created.body.dateCreated && created.body.dateUpdated);

  assert.equal((await call("POST", "/departments/", { token, body: finance })).status, 409);
  assert.equal((await call("POST", "/departments/", { token, body: { name: "x" } })).status, 400);

  const list = await call("GET", "/departments/", { token });
  assert.equal(list.body.count, 1);
  assert.equal(list.body.data[0]._id, created.body._id);

  const update = await call("PUT", `/departments/${created.body._id}`, {
    token,
    body: { ...finance, description: "Updated", isActive: false },
  });
  assert.equal(update.status, 200);
  assert.equal(update.body.message, "Department is successfully updated!");

  const one = await call("GET", `/departments/${created.body._id}`, { token });
  assert.equal(one.body.description, "Updated");
  assert.equal(one.body.isActive, false);

  assert.equal((await call("DELETE", `/departments/${created.body._id}`, { token })).status, 200);
  assert.equal((await call("GET", `/departments/${created.body._id}`, { token })).status, 404);
});

test("leave types: name required, isPaid must be a real boolean, duplicates rejected", async () => {
  assert.equal((await call("GET", "/leave-types/")).status, 401);

  const { body: login } = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  const token = login.token;

  const annual = await call("POST", "/leave-types/", { token, body: { name: "Annual Leave", isPaid: true } });
  assert.equal(annual.status, 200);
  assert.equal(annual.body.isPaid, true);
  assert.equal(annual.body.isActive, true);

  // isPaid defaults to false when omitted
  const unpaid = await call("POST", "/leave-types/", { token, body: { name: "Unpaid Leave" } });
  assert.equal(unpaid.body.isPaid, false);

  assert.equal((await call("POST", "/leave-types/", { token, body: { name: "Annual Leave" } })).status, 409);
  assert.equal((await call("POST", "/leave-types/", { token, body: { isPaid: true } })).status, 400);
  // the string "false" must not be accepted and stored as truthy
  assert.equal(
    (await call("POST", "/leave-types/", { token, body: { name: "Sick", isPaid: "false" } })).status,
    400
  );

  const update = await call("PUT", `/leave-types/${unpaid.body._id}`, {
    token,
    body: { name: "Unpaid Leave", isPaid: false, isActive: false },
  });
  assert.equal(update.status, 200);
  assert.equal((await call("GET", `/leave-types/${unpaid.body._id}`, { token })).body.isActive, false);

  assert.equal((await call("DELETE", `/leave-types/${annual.body._id}`, { token })).status, 200);
  assert.equal((await call("DELETE", `/leave-types/${annual.body._id}`, { token })).status, 404);
});

test("roles and role assignments", async () => {
  assert.equal((await call("GET", "/roles/")).status, 401);
  assert.equal((await call("GET", "/administrators/")).status, 401);

  const { body: login } = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  const token = login.token;

  // Administrators are listable, without password hashes.
  const admins = await call("GET", "/administrators/", { token });
  assert.equal(admins.status, 200);
  assert.ok(admins.body.count >= 1);
  assert.ok(!JSON.stringify(admins.body).toLowerCase().includes("password"));
  const alice = admins.body.data.find((a) => a.username === "alice");

  const role = await call("POST", "/roles/", { token, body: { name: "HR Manager", description: "Runs HR" } });
  assert.equal(role.status, 200);
  assert.equal((await call("POST", "/roles/", { token, body: { name: "HR Manager" } })).status, 409);
  assert.equal((await call("POST", "/roles/", { token, body: {} })).status, 400);

  // Assign it
  const assignment = await call("POST", "/role-assignments/", {
    token,
    body: { administratorId: alice._id, roleId: role.body._id },
  });
  assert.equal(assignment.status, 200);
  assert.equal(assignment.body.administratorId, alice._id);
  assert.equal(assignment.body.roleId, role.body._id);

  // The same pair twice, unknown ids and malformed bodies are rejected
  const again = { administratorId: alice._id, roleId: role.body._id };
  assert.equal((await call("POST", "/role-assignments/", { token, body: again })).status, 409);
  assert.equal(
    (await call("POST", "/role-assignments/", {
      token,
      body: { administratorId: "nope", roleId: role.body._id },
    })).status,
    400
  );
  assert.equal(
    (await call("POST", "/role-assignments/", {
      token,
      body: { administratorId: alice._id, roleId: "000000000000000000009999" },
    })).status,
    400
  );
  assert.equal((await call("POST", "/role-assignments/", { token, body: {} })).status, 400);

  const list = await call("GET", "/role-assignments/", { token });
  assert.equal(list.body.count, 1);

  // Assignments are never edited
  assert.equal(
    (await call("PUT", `/role-assignments/${assignment.body._id}`, { token, body: again })).status,
    404
  );

  // A role someone holds cannot be deleted until the assignment is removed
  assert.equal((await call("DELETE", `/roles/${role.body._id}`, { token })).status, 409);
  assert.equal((await call("DELETE", `/role-assignments/${assignment.body._id}`, { token })).status, 200);
  assert.equal((await call("DELETE", `/roles/${role.body._id}`, { token })).status, 200);
  assert.equal((await call("GET", `/roles/${role.body._id}`, { token })).status, 404);
});

const signIn = async () => {
  const { body } = await call("POST", "/admin/login", {
    body: { username: "alice", password: "pass-word1!" },
  });
  return body.token;
};

const newEmployee = (email) => ({
  first_name: "Leave",
  last_name: "Taker",
  email,
  position: "Accountant",
  department: "Finance and Accounting",
  salary: "5000",
});

test("leave balances: attached to an employee and leave type, max and available enforced", async () => {
  const token = await signIn();

  const employee = (await call("POST", "/employees/", { token, body: newEmployee("lb@example.com") })).body;
  const annual = (await call("POST", "/leave-types/", { token, body: { name: "LB Annual", isPaid: true } })).body;

  assert.equal((await call("GET", "/leave-balances/")).status, 401);

  // availableLeaves defaults to maxLeaves
  const balance = await call("POST", "/leave-balances/", {
    token,
    body: { employeeId: employee._id, leaveTypeId: annual._id, maxLeaves: 15 },
  });
  assert.equal(balance.status, 200);
  assert.equal(balance.body.maxLeaves, 15);
  assert.equal(balance.body.availableLeaves, 15);
  assert.equal(balance.body.isActive, true);

  const post = (body) => call("POST", "/leave-balances/", { token, body });
  const ids = { employeeId: employee._id, leaveTypeId: annual._id };

  assert.equal((await post({ ...ids, maxLeaves: 10 })).status, 409); // one balance per employee and type
  assert.equal((await post({ ...ids, maxLeaves: -1 })).status, 400);
  assert.equal((await post({ ...ids, maxLeaves: "15" })).status, 400); // numbers only
  assert.equal((await post({ employeeId: employee._id, maxLeaves: 5 })).status, 400);
  assert.equal((await post({ employeeId: "nope", leaveTypeId: annual._id, maxLeaves: 5 })).status, 400);

  const sick = (await call("POST", "/leave-types/", { token, body: { name: "LB Sick", isPaid: true } })).body;
  const tooMuch = await post({ employeeId: employee._id, leaveTypeId: sick._id, maxLeaves: 5, availableLeaves: 6 });
  assert.equal(tooMuch.status, 400);
  const half = await post({ employeeId: employee._id, leaveTypeId: sick._id, maxLeaves: 5, availableLeaves: 2.5 });
  assert.equal(half.status, 200);
  assert.equal(half.body.availableLeaves, 2.5);

  // Listed under the employee
  const mine = await call("GET", `/employees/${employee._id}/leave-balances`, { token });
  assert.equal(mine.body.count, 2);
  assert.equal((await call("GET", "/employees/000000000000000000008888/leave-balances", { token })).status, 404);

  // Update: available can move, but never above max
  const put = (body) => call("PUT", `/leave-balances/${balance.body._id}`, { token, body });
  assert.equal((await put({ availableLeaves: 12 })).status, 200);
  assert.equal((await call("GET", `/leave-balances/${balance.body._id}`, { token })).body.availableLeaves, 12);
  assert.equal((await put({ availableLeaves: 99 })).status, 400);
  assert.equal((await put({ maxLeaves: 5 })).status, 400); // would leave 12 available of 5
  assert.equal((await put({ maxLeaves: 20, availableLeaves: 18 })).status, 200);

  // A leave type with balances cannot be deleted
  assert.equal((await call("DELETE", `/leave-types/${annual._id}`, { token })).status, 409);
});

test("leave requests: filing validates dates and balance, status starts pending", async () => {
  const token = await signIn();
  const employee = (await call("POST", "/employees/", { token, body: newEmployee("lr@example.com") })).body;
  const type = (await call("POST", "/leave-types/", { token, body: { name: "LR Annual", isPaid: true } })).body;
  await call("POST", "/leave-balances/", {
    token,
    body: { employeeId: employee._id, leaveTypeId: type._id, maxLeaves: 5 },
  });

  const file = (body) =>
    call("POST", "/leave-requests/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, ...body },
    });

  assert.equal((await call("GET", "/leave-requests/")).status, 401);

  const ok = await file({ startDate: "2025-03-03", endDate: "2025-03-05", reason: "  Family  " });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.status, "pending");
  assert.equal(ok.body.days, 3);
  assert.equal(ok.body.reason, "Family");

  // inclusive: a single day is 1
  assert.equal((await file({ startDate: "2025-04-01", endDate: "2025-04-01" })).body.days, 1);

  assert.equal((await file({ startDate: "2025-03-05", endDate: "2025-03-03" })).status, 400); // ends before start
  assert.equal((await file({ startDate: "2025-02-31", endDate: "2025-03-03" })).status, 400); // not a real date
  assert.equal((await file({ startDate: "03/03/2025", endDate: "03/05/2025" })).status, 400);
  assert.equal((await file({})).status, 400);
  assert.equal((await file({ startDate: "2025-05-01", endDate: "2025-05-10" })).status, 400); // 10 days > 5 available

  const other = (await call("POST", "/leave-types/", { token, body: { name: "LR No Balance" } })).body;
  const noBalance = await call("POST", "/leave-requests/", {
    token,
    body: { employeeId: employee._id, leaveTypeId: other._id, startDate: "2025-03-03", endDate: "2025-03-03" },
  });
  assert.equal(noBalance.status, 400);

  // Listed under the employee, and history blocks deleting the employee or the leave type
  assert.equal((await call("GET", `/employees/${employee._id}/leave-requests`, { token })).body.count, 2);
  assert.equal((await call("DELETE", `/employees/${employee._id}`, { token })).status, 409);
  assert.equal((await call("DELETE", `/leave-types/${type._id}`, { token })).status, 409);

  // Requests are never edited or deleted
  assert.equal((await call("PUT", `/leave-requests/${ok.body._id}`, { token, body: {} })).status, 404);
  assert.equal((await call("DELETE", `/leave-requests/${ok.body._id}`, { token })).status, 404);
});

test("approval: approve deducts the balance and records who approved; decisions are final", async () => {
  const token = await signIn();
  const admins = (await call("GET", "/administrators/", { token })).body.data;
  const alice = admins.find((a) => a.username === "alice");

  const employee = (await call("POST", "/employees/", { token, body: newEmployee("ap@example.com") })).body;
  const type = (await call("POST", "/leave-types/", { token, body: { name: "AP Annual", isPaid: true } })).body;
  const balance = (
    await call("POST", "/leave-balances/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, maxLeaves: 5 },
    })
  ).body;

  const file = async (startDate, endDate) =>
    (
      await call("POST", "/leave-requests/", {
        token,
        body: { employeeId: employee._id, leaveTypeId: type._id, startDate, endDate },
      })
    ).body;

  const availableNow = async () =>
    (await call("GET", `/leave-balances/${balance._id}`, { token })).body.availableLeaves;

  const first = await file("2025-06-02", "2025-06-04"); // 3 days
  const second = await file("2025-07-01", "2025-07-03"); // 3 days: allowed to file, only 5 available in total

  // Needs a signed-in administrator
  assert.equal((await call("POST", `/leave-requests/${first._id}/approve`)).status, 401);

  // Filing alone does not touch the balance
  assert.equal(await availableNow(), 5);

  const approved = await call("POST", `/leave-requests/${first._id}/approve`, {
    token,
    body: { remarks: "  Enjoy  " },
  });
  assert.equal(approved.status, 200);
  assert.equal(approved.body.status, "approved");
  assert.equal(await availableNow(), 2);

  // Who approved: the signed-in administrator, recorded with the remarks
  const approvals = await call("GET", `/leave-requests/${first._id}/approvals`, { token });
  assert.equal(approvals.body.count, 1);
  assert.equal(approvals.body.data[0].approverId, alice._id);
  assert.equal(approvals.body.data[0].decision, "approved");
  assert.equal(approvals.body.data[0].remarks, "Enjoy");
  assert.ok(approvals.body.data[0].dateCreated);

  // The approver cannot be spoofed through the body
  const spoofed = await call("POST", `/leave-requests/${second._id}/reject`, {
    token,
    body: { approverId: "000000000000000000007777", remarks: "no" },
  });
  assert.equal(spoofed.status, 200);
  const rejectedApprovals = await call("GET", `/leave-requests/${second._id}/approvals`, { token });
  assert.equal(rejectedApprovals.body.data[0].approverId, alice._id);
  assert.equal(rejectedApprovals.body.data[0].decision, "rejected");

  // Decisions are final
  assert.equal((await call("POST", `/leave-requests/${first._id}/approve`, { token })).status, 409);
  assert.equal((await call("POST", `/leave-requests/${first._id}/reject`, { token })).status, 409);
  assert.equal((await call("POST", `/leave-requests/${first._id}/cancel`, { token })).status, 409);
  assert.equal((await call("POST", `/leave-requests/${second._id}/approve`, { token })).status, 409);
  assert.equal(await availableNow(), 2); // rejected leave never touched the balance

  assert.equal((await call("POST", "/leave-requests/000000000000000000006666/approve", { token })).status, 404);
  assert.equal(
    (await call("GET", "/leave-requests/000000000000000000006666/approvals", { token })).status,
    404
  );
});

test("approval: cannot approve beyond the balance, even when filed before it was spent", async () => {
  const token = await signIn();
  const employee = (await call("POST", "/employees/", { token, body: newEmployee("ov@example.com") })).body;
  const type = (await call("POST", "/leave-types/", { token, body: { name: "OV Annual", isPaid: true } })).body;
  const balance = (
    await call("POST", "/leave-balances/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, maxLeaves: 4 },
    })
  ).body;

  const file = async (start, end) =>
    (
      await call("POST", "/leave-requests/", {
        token,
        body: { employeeId: employee._id, leaveTypeId: type._id, startDate: start, endDate: end },
      })
    ).body;

  const a = await file("2025-08-01", "2025-08-03"); // 3 days
  const b = await file("2025-09-01", "2025-09-03"); // 3 days, but only 4 in total

  assert.equal((await call("POST", `/leave-requests/${a._id}/approve`, { token })).status, 200);

  const second = await call("POST", `/leave-requests/${b._id}/approve`, { token });
  assert.equal(second.status, 400);
  assert.match(second.body.message, /Not enough leave balance/);

  // Nothing changed: balance still 1, and b is still pending and can be rejected
  assert.equal((await call("GET", `/leave-balances/${balance._id}`, { token })).body.availableLeaves, 1);
  assert.equal((await call("GET", `/leave-requests/${b._id}`, { token })).body.status, "pending");
  assert.equal((await call("POST", `/leave-requests/${b._id}/reject`, { token })).status, 200);
});

test("cancel: only pending requests, no approval record, balance untouched", async () => {
  const token = await signIn();
  const employee = (await call("POST", "/employees/", { token, body: newEmployee("cn@example.com") })).body;
  const type = (await call("POST", "/leave-types/", { token, body: { name: "CN Annual", isPaid: true } })).body;
  const balance = (
    await call("POST", "/leave-balances/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, maxLeaves: 5 },
    })
  ).body;

  const request = (
    await call("POST", "/leave-requests/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, startDate: "2025-10-01", endDate: "2025-10-02" },
    })
  ).body;

  const cancelled = await call("POST", `/leave-requests/${request._id}/cancel`, { token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "cancelled");
  assert.equal((await call("GET", `/leave-requests/${request._id}/approvals`, { token })).body.count, 0);
  assert.equal((await call("GET", `/leave-balances/${balance._id}`, { token })).body.availableLeaves, 5);

  // A cancelled request cannot then be approved
  assert.equal((await call("POST", `/leave-requests/${request._id}/approve`, { token })).status, 409);
});

test("deleting an employee without leave history also deletes their balances", async () => {
  const token = await signIn();
  const employee = (await call("POST", "/employees/", { token, body: newEmployee("del@example.com") })).body;
  const type = (await call("POST", "/leave-types/", { token, body: { name: "DEL Annual" } })).body;
  const balance = (
    await call("POST", "/leave-balances/", {
      token,
      body: { employeeId: employee._id, leaveTypeId: type._id, maxLeaves: 5 },
    })
  ).body;

  assert.equal((await call("DELETE", `/employees/${employee._id}`, { token })).status, 200);
  assert.equal((await call("GET", `/leave-balances/${balance._id}`, { token })).status, 404);
  // ...which also frees the leave type for deletion
  assert.equal((await call("DELETE", `/leave-types/${type._id}`, { token })).status, 200);
});

// --- audit logs ---------------------------------------------------------------------------------

const settle = () => new Promise((resolve) => setTimeout(resolve, 100)); // entries are written just after the response

test("changes are recorded in the audit log, with who did them and never what was submitted", async () => {
  const token = await signIn();
  const created = (await call("POST", "/employees/", { token, body: newEmployee("audit@example.com") })).body;
  await call("PUT", `/employees/${created._id}`, { token, body: { ...newEmployee("audit@example.com"), position: "Lead" } });
  await call("GET", `/employees/${created._id}`, { token }); // reads are not audited
  await call("DELETE", `/employees/${created._id}`, { token });
  await call("POST", "/employees/", { token, body: {} }); // fails validation: not audited
  await settle();

  const { status, body } = await call("GET", "/audit-logs/?page=1&pageSize=100&search=" + created._id, { token });
  assert.equal(status, 200);
  assert.deepEqual(body.data.map((entry) => entry.action).sort(), ["delete", "update"]);

  const entry = body.data[0];
  assert.equal(entry.resource, "employees");
  assert.equal(entry.resourceId, created._id);
  assert.equal(entry.actorName, "alice");
  assert.ok(entry.actorId);
  assert.ok(entry._id);
  assert.ok(entry.dateCreated);
  assert.equal(JSON.stringify(body).includes("pass-word1!"), false);

  const everything = (await call("GET", "/audit-logs/?page=1&pageSize=100", { token })).body.data;
  assert.ok(everything.some((e) => e.action === "create" && e.resource === "employees"));
  assert.ok(everything.some((e) => e.action === "login" && e.actorName === "alice"));
  assert.equal(everything.some((e) => e.method === "GET"), false);
  assert.equal(everything.some((e) => e.resource === "admin" && e.path.includes("refresh")), false);
});

test("a failed login is audited under the name that was typed", async () => {
  const token = await signIn();
  const wrong = await call("POST", "/admin/login", { body: { username: "mallory", password: "nope-nope-1!" } });
  assert.ok(wrong.status >= 400);
  await settle();

  const { body } = await call("GET", "/audit-logs/?page=1&pageSize=100&search=mallory", { token });
  assert.equal(body.count, 1);
  assert.equal(body.data[0].action, "login_failed");
  assert.equal(body.data[0].actorId, undefined);
  assert.equal(JSON.stringify(body).includes("nope-nope-1!"), false);
});

test("audit logs are read-only over HTTP and need a signed-in administrator", async () => {
  assert.equal((await call("GET", "/audit-logs/")).status, 401);

  const token = await signIn();
  const first = (await call("GET", "/audit-logs/?page=1&pageSize=1", { token })).body;
  assert.equal(first.data.length, 1);
  assert.ok(first.totalPages >= 1);
  const id = first.data[0]._id;

  assert.equal((await call("GET", `/audit-logs/${id}`, { token })).status, 200);
  assert.equal((await call("POST", "/audit-logs/", { token, body: { action: "forged" } })).status, 404);
  assert.equal((await call("PUT", `/audit-logs/${id}`, { token, body: { action: "edited" } })).status, 404);
  assert.equal((await call("DELETE", `/audit-logs/${id}`, { token })).status, 404);
  assert.equal((await call("GET", `/audit-logs/${id}`, { token })).body.action, first.data[0].action);
});

// --- inventory ----------------------------------------------------------------------------------

const newItem = (serialNumber, extra = {}) => ({
  name: "ThinkPad T14",
  serialNumber,
  category: "Laptop",
  status: "available",
  location: "HQ store room",
  purchaseDate: "2025-01-15",
  purchaseCost: 1200,
  ...extra,
});

test("inventory items can be created, listed in pages, searched, updated and deleted", async () => {
  const token = await signIn();
  const created = await call("POST", "/inventory/", { token, body: newItem("SN-0001") });
  assert.equal(created.status, 200);
  assert.ok(created.body._id);
  assert.equal(created.body.status, "available");

  await call("POST", "/inventory/", { token, body: newItem("SN-0002", { name: "Dell U2723", category: "Monitor" }) });

  const page = await call("GET", "/inventory/?page=1&pageSize=1&sortBy=serialNumber", { token });
  assert.equal(page.body.count, 2);
  assert.equal(page.body.data.length, 1);
  assert.equal(page.body.data[0].serialNumber, "SN-0001");

  const found = await call("GET", "/inventory/?page=1&pageSize=10&search=monitor", { token });
  assert.equal(found.body.count, 1);
  assert.equal(found.body.data[0].serialNumber, "SN-0002");

  const updated = await call("PUT", `/inventory/${created.body._id}`, {
    token,
    body: newItem("SN-0001", { status: "maintenance", location: "Repair desk" }),
  });
  assert.equal(updated.status, 200);
  assert.equal((await call("GET", `/inventory/${created.body._id}`, { token })).body.status, "maintenance");

  assert.equal((await call("DELETE", `/inventory/${created.body._id}`, { token })).status, 200);
  assert.equal((await call("GET", `/inventory/${created.body._id}`, { token })).status, 404);
});

test("inventory rejects bad input and duplicate serial numbers", async () => {
  const token = await signIn();
  assert.equal((await call("POST", "/inventory/", { token, body: { name: "No serial" } })).status, 400);
  assert.equal((await call("POST", "/inventory/", { token, body: newItem("SN-BAD", { status: "lost" }) })).status, 400);
  assert.equal((await call("POST", "/inventory/", { token, body: newItem("SN-BAD", { purchaseCost: -5 }) })).status, 400);

  assert.equal((await call("POST", "/inventory/", { token, body: newItem("SN-DUP") })).status, 200);
  assert.equal((await call("POST", "/inventory/", { token, body: newItem("SN-DUP") })).status, 409);
  assert.equal((await call("GET", "/inventory/")).status, 401);
});

test("only an item in use is assigned, to an employee who exists, and that employee cannot be deleted while holding it", async () => {
  const token = await signIn();
  const holder = (await call("POST", "/employees/", { token, body: newEmployee("holder@example.com") })).body;

  // in use needs an assignee; an assignee needs "in use"; the employee must exist
  assert.equal((await call("POST", "/inventory/", { token, body: newItem("SN-A1", { status: "in_use" }) })).status, 400);
  assert.equal(
    (await call("POST", "/inventory/", { token, body: newItem("SN-A2", { assignedEmployeeId: holder._id }) })).status,
    400
  );
  assert.equal(
    (await call("POST", "/inventory/", { token, body: newItem("SN-A3", { status: "in_use", assignedEmployeeId: "0".repeat(24) }) })).status,
    400
  );

  const item = await call("POST", "/inventory/", {
    token,
    body: newItem("SN-A4", { status: "in_use", assignedEmployeeId: holder._id }),
  });
  assert.equal(item.status, 200);
  assert.equal(item.body.assignedEmployeeId, holder._id);

  assert.equal((await call("DELETE", `/employees/${holder._id}`, { token })).status, 409);

  // returned: back to available and unassigned, so the employee can go
  const returned = await call("PUT", `/inventory/${item.body._id}`, {
    token,
    body: newItem("SN-A4", { status: "available", assignedEmployeeId: "" }),
  });
  assert.equal(returned.status, 200);
  assert.equal((await call("DELETE", `/employees/${holder._id}`, { token })).status, 200);
});

// --- government IDs -----------------------------------------------------------------------------

test("employees can carry SSS, TIN, PhilHealth and Pag-IBIG numbers, stored as digits", async () => {
  const token = await signIn();
  const created = await call("POST", "/employees/", {
    token,
    body: {
      ...newEmployee("ids@example.com"),
      sssNumber: "12-3456789-0",
      tinNumber: "123-456-789-000",
      philhealthNumber: "12-345678901-2",
      pagibigNumber: "1234-5678-9012",
    },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.sssNumber, "1234567890");
  assert.equal(created.body.tinNumber, "123456789000");
  assert.equal(created.body.philhealthNumber, "123456789012");
  assert.equal(created.body.pagibigNumber, "123456789012");

  // a 9-digit TIN is valid too; blank clears an ID
  const updated = await call("PUT", `/employees/${created.body._id}`, {
    token,
    body: { ...newEmployee("ids@example.com"), tinNumber: "123-456-789", sssNumber: "" },
  });
  assert.equal(updated.status, 200);
  const one = (await call("GET", `/employees/${created.body._id}`, { token })).body;
  assert.equal(one.tinNumber, "123456789");
  assert.equal(one.sssNumber, "");
});

test("employee ID numbers with the wrong length or characters are rejected", async () => {
  const token = await signIn();
  const bad = (extra) => call("POST", "/employees/", { token, body: { ...newEmployee("badids@example.com"), ...extra } });
  assert.equal((await bad({ sssNumber: "12345" })).status, 400);
  assert.equal((await bad({ tinNumber: "1234567890" })).status, 400);
  assert.equal((await bad({ philhealthNumber: "12-34-56" })).status, 400);
  assert.equal((await bad({ pagibigNumber: "ABCD-EFGH-IJKL" })).status, 400);
  // none of those attempts created the employee
  assert.equal((await call("POST", "/employees/", { token, body: newEmployee("badids@example.com") })).status, 200);
});

// --- dashboard ----------------------------------------------------------------------------------

test("the dashboard endpoints need sign-in and return today's headcount and a present/absent series", async () => {
  assert.equal((await call("GET", "/dashboard/summary")).status, 401);
  assert.equal((await call("GET", "/dashboard/attendance")).status, 401);

  const token = await signIn();
  const summary = (await call("GET", "/dashboard/summary", { token })).body;
  assert.equal(summary.total, summary.active + summary.inactive);
  assert.equal(summary.present + summary.absent, summary.active);
  assert.match(summary.date, /^\d{4}-\d{2}-\d{2}$/);

  const attendance = (await call("GET", "/dashboard/attendance?days=7", { token })).body;
  assert.ok(attendance.count >= 1 && attendance.count <= 5);
  assert.deepEqual(Object.keys(attendance.data[0]).sort(), ["absent", "date", "present"]);
});

// --- employee portal ----------------------------------------------------------------------------

const employeeLogin = (email, password) => call("POST", "/employee-auth/login", { body: { email, password } });

test("an employee signs in with the portal password an administrator set, and sees only the portal", async () => {
  const admin = await signIn();
  const created = await call("POST", "/employees/", {
    token: admin,
    body: { ...newEmployee("portal@example.com"), portalPassword: "portal-pass-1" },
  });
  assert.equal(created.status, 200);
  // neither the password nor a hash of it ever comes back
  assert.equal(JSON.stringify(created.body).includes("portal-pass-1"), false);
  assert.equal("passwordHash" in created.body, false);
  assert.equal("portalPassword" in created.body, false);
  assert.equal(JSON.stringify((await call("GET", `/employees/${created.body._id}`, { token: admin })).body).includes("passwordHash"), false);

  const login = await employeeLogin("Portal@Example.com", "portal-pass-1"); // email is not case sensitive
  assert.equal(login.status, 200);
  assert.ok(login.body.token);

  const me = await call("GET", "/employee-portal/me", { token: login.body.token });
  assert.equal(me.status, 200);
  assert.equal(me.body.email, "portal@example.com");
  assert.equal(me.body.salary, undefined); // only name, email, position and department

  // the two kinds of token are not interchangeable
  assert.equal((await call("GET", "/employees/", { token: login.body.token })).status, 401);
  assert.equal((await call("GET", "/audit-logs/", { token: login.body.token })).status, 401);
  assert.equal((await call("GET", "/employee-portal/me", { token: admin })).status, 401);
  assert.equal((await call("GET", "/employee-portal/me")).status, 401);
});

test("employee sign-in rejects a wrong password, an unknown email, no password and an inactive employee alike", async () => {
  const admin = await signIn();
  await call("POST", "/employees/", { token: admin, body: { ...newEmployee("known@example.com"), portalPassword: "known-pass-1" } });
  await call("POST", "/employees/", { token: admin, body: newEmployee("nopass@example.com") });
  await call("POST", "/employees/", {
    token: admin,
    body: { ...newEmployee("gone@example.com"), portalPassword: "gone-pass-12", status: "false" },
  });

  const wrong = await employeeLogin("known@example.com", "not-the-password");
  const unknown = await employeeLogin("nobody@example.com", "known-pass-1");
  const none = await employeeLogin("nopass@example.com", "anything-at-all");
  const inactive = await employeeLogin("gone@example.com", "gone-pass-12");
  for (const attempt of [wrong, unknown, none, inactive]) assert.equal(attempt.status, 400);
  assert.equal(new Set([wrong, unknown, none, inactive].map((a) => a.body.message)).size, 1); // no hint which case it was

  assert.equal((await employeeLogin({ $ne: null }, "x")).status, 400);
  assert.equal((await call("POST", "/employee-auth/login", { body: { email: "known@example.com" } })).status, 400);
});

test("a portal password is length checked, replaced when sent again and kept when left blank", async () => {
  const admin = await signIn();
  const tooShort = await call("POST", "/employees/", { token: admin, body: { ...newEmployee("short@example.com"), portalPassword: "short" } });
  assert.equal(tooShort.status, 400);

  const created = (await call("POST", "/employees/", { token: admin, body: { ...newEmployee("change@example.com"), portalPassword: "first-pass-12" } })).body;
  assert.equal((await employeeLogin("change@example.com", "first-pass-12")).status, 200);

  // editing without a password keeps the current one
  await call("PUT", `/employees/${created._id}`, { token: admin, body: { ...newEmployee("change@example.com"), position: "Lead", portalPassword: "" } });
  assert.equal((await employeeLogin("change@example.com", "first-pass-12")).status, 200);

  // sending a new one replaces it
  await call("PUT", `/employees/${created._id}`, { token: admin, body: { ...newEmployee("change@example.com"), portalPassword: "second-pass-12" } });
  assert.equal((await employeeLogin("change@example.com", "first-pass-12")).status, 400);
  assert.equal((await employeeLogin("change@example.com", "second-pass-12")).status, 200);
});

test("employee sign-ins are audited, without the password", async () => {
  const admin = await signIn();
  await employeeLogin("known@example.com", "known-pass-1");
  await employeeLogin("known@example.com", "wrong-pass-123");
  await settle();

  const { body } = await call("GET", "/audit-logs/?page=1&pageSize=100&search=employee-auth", { token: admin });
  assert.ok(body.data.some((e) => e.action === "login" && e.resource === "employee-auth"));
  assert.ok(body.data.some((e) => e.action === "login_failed" && e.actorName === "known@example.com"));
  assert.equal(JSON.stringify(body).includes("known-pass-1"), false);
  assert.equal(JSON.stringify(body).includes("wrong-pass-123"), false);
});

// --- employee portal: leave and equipment -------------------------------------------------------

/** Creates an employee with a portal password and returns their id and employee token. */
const portalEmployee = async (admin, email) => {
  const created = (await call("POST", "/employees/", {
    token: admin,
    body: { ...newEmployee(email), portalPassword: "portal-pass-1" },
  })).body;
  const login = await employeeLogin(email, "portal-pass-1");
  return { id: created._id, token: login.body.token };
};

test("an employee files leave for themselves, sees only their own leave and can cancel a pending request", async () => {
  const admin = await signIn();
  const ann = await portalEmployee(admin, "leave-ann@example.com");
  const bob = await portalEmployee(admin, "leave-bob@example.com");
  const type = (await call("POST", "/leave-types/", { token: admin, body: { name: "Portal Annual", isPaid: true } })).body;
  await call("POST", "/leave-balances/", { token: admin, body: { employeeId: ann.id, leaveTypeId: type._id, maxLeaves: 5 } });

  assert.equal((await call("GET", "/employee-portal/leave-types")).status, 401);
  assert.equal((await call("GET", "/employee-portal/leave-types", { token: admin })).status, 401);
  assert.ok((await call("GET", "/employee-portal/leave-types", { token: ann.token })).body.data.some((t) => t._id === type._id));

  const balances = (await call("GET", "/employee-portal/leave-balances", { token: ann.token })).body;
  assert.equal(balances.count, 1);
  assert.equal((await call("GET", "/employee-portal/leave-balances", { token: bob.token })).body.count, 0);

  // the employee comes from the sign-in: an employeeId in the body is ignored
  const filed = await call("POST", "/employee-portal/leave-requests", {
    token: ann.token,
    body: { employeeId: bob.id, leaveTypeId: type._id, startDate: "2030-03-04", endDate: "2030-03-06", reason: "Trip" },
  });
  assert.equal(filed.status, 200);
  assert.equal(filed.body.employeeId, ann.id);
  assert.equal(filed.body.status, "pending");
  assert.equal(filed.body.days, 3);

  assert.equal((await call("GET", "/employee-portal/leave-requests", { token: ann.token })).body.count, 1);
  assert.equal((await call("GET", "/employee-portal/leave-requests", { token: bob.token })).body.count, 0);

  // more days than the balance allows, bad dates, and a leave type with no balance are all refused
  const tooMany = await call("POST", "/employee-portal/leave-requests", {
    token: ann.token,
    body: { leaveTypeId: type._id, startDate: "2030-04-01", endDate: "2030-04-30" },
  });
  assert.equal(tooMany.status, 400);
  const badDates = await call("POST", "/employee-portal/leave-requests", {
    token: ann.token,
    body: { leaveTypeId: type._id, startDate: "2030-04-05", endDate: "2030-04-01" },
  });
  assert.equal(badDates.status, 400);
  const noBalance = await call("POST", "/employee-portal/leave-requests", {
    token: bob.token,
    body: { leaveTypeId: type._id, startDate: "2030-04-01", endDate: "2030-04-02" },
  });
  assert.equal(noBalance.status, 400);

  // someone else's request looks like it does not exist; their own pending one can be withdrawn
  assert.equal((await call("POST", `/employee-portal/leave-requests/${filed.body._id}/cancel`, { token: bob.token })).status, 404);
  const cancelled = await call("POST", `/employee-portal/leave-requests/${filed.body._id}/cancel`, { token: ann.token });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.status, "cancelled");
});

test("an employee borrows equipment and it disappears from everyone else's list until it is returned", async () => {
  const admin = await signIn();
  const ann = await portalEmployee(admin, "borrow-ann@example.com");
  const bob = await portalEmployee(admin, "borrow-bob@example.com");
  const item = (await call("POST", "/inventory/", {
    token: admin,
    body: { name: "Borrow Laptop", serialNumber: "BORROW-1", category: "Laptop", purchaseCost: 1200, notes: "private" },
  })).body;

  assert.equal((await call("GET", "/employee-portal/equipment")).status, 401);
  assert.equal((await call("GET", "/employee-portal/equipment", { token: admin })).status, 401);

  const before = (await call("GET", "/employee-portal/equipment", { token: bob.token })).body;
  const listed = before.available.find((i) => i._id === item._id);
  assert.ok(listed);
  assert.equal(listed.purchaseCost, undefined); // only the fields an employee needs
  assert.equal(listed.notes, undefined);

  const borrowed = await call("POST", `/employee-portal/equipment/${item._id}/borrow`, { token: ann.token });
  assert.equal(borrowed.status, 200);
  assert.equal(borrowed.body.status, "in_use");

  // hidden from Bob, shown to Ann as hers
  const bobsView = (await call("GET", "/employee-portal/equipment", { token: bob.token })).body;
  assert.equal(bobsView.available.some((i) => i._id === item._id), false);
  assert.equal(bobsView.borrowed.some((i) => i._id === item._id), false);
  const annsView = (await call("GET", "/employee-portal/equipment", { token: ann.token })).body;
  assert.equal(annsView.available.some((i) => i._id === item._id), false);
  assert.ok(annsView.borrowed.some((i) => i._id === item._id));

  // Bob cannot take it, return it, or learn who has it
  assert.equal((await call("POST", `/employee-portal/equipment/${item._id}/borrow`, { token: bob.token })).status, 409);
  assert.equal((await call("POST", `/employee-portal/equipment/${item._id}/return`, { token: bob.token })).status, 404);
  assert.equal((await call("GET", `/inventory/${item._id}`, { token: admin })).body.assignedEmployeeId, ann.id);

  const history = (await call("GET", "/employee-portal/borrowings", { token: ann.token })).body;
  assert.equal(history.count, 1);
  assert.equal(history.data[0].returnedAt, null);
  assert.equal((await call("GET", "/employee-portal/borrowings", { token: bob.token })).body.count, 0);

  // once Ann returns it, it is back on the list for everyone
  assert.equal((await call("POST", `/employee-portal/equipment/${item._id}/return`, { token: ann.token })).status, 200);
  assert.ok((await call("GET", "/employee-portal/equipment", { token: bob.token })).body.available.some((i) => i._id === item._id));
  assert.ok((await call("GET", "/employee-portal/borrowings", { token: ann.token })).body.data[0].returnedAt);
  assert.equal((await call("POST", `/employee-portal/equipment/${item._id}/borrow`, { token: bob.token })).status, 200);
});

test("equipment that is under maintenance, retired, inactive or unknown cannot be borrowed", async () => {
  const admin = await signIn();
  const ann = await portalEmployee(admin, "borrow-cat@example.com");
  const maintenance = (await call("POST", "/inventory/", {
    token: admin,
    body: { name: "Borrow Printer", serialNumber: "BORROW-2", status: "maintenance" },
  })).body;

  const view = (await call("GET", "/employee-portal/equipment", { token: ann.token })).body;
  assert.equal(view.available.some((i) => i._id === maintenance._id), false);
  assert.equal((await call("POST", `/employee-portal/equipment/${maintenance._id}/borrow`, { token: ann.token })).status, 409);
  assert.equal((await call("POST", "/employee-portal/equipment/000000000000000000000999/borrow", { token: ann.token })).status, 404);
});
