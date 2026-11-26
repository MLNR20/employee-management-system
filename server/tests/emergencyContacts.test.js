// Emergency contacts (one employee, many contacts) and the name rules (letters only, 2+ characters),
// driven over HTTP against in-memory repositories.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/presentation/http/app.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import { createEmergencyContactUseCases } from "../src/application/employee/emergencyContactUseCases.js";
import { createDepartmentUseCases } from "../src/application/department/departmentUseCases.js";
import { createLeaveTypeUseCases } from "../src/application/leave/leaveTypeUseCases.js";
import { createLeaveBalanceUseCases } from "../src/application/leave/leaveBalanceUseCases.js";
import { createLeaveRequestUseCases } from "../src/application/leave/leaveRequestUseCases.js";
import { createRoleUseCases, createRoleAssignmentUseCases } from "../src/application/role/roleUseCases.js";
import { createAdministratorUseCases } from "../src/application/administrator/administratorUseCases.js";
import { createInventoryUseCases } from "../src/application/inventory/inventoryUseCases.js";
import { createDashboardUseCases } from "../src/application/dashboard/dashboardUseCases.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  InMemoryAdministratorRepository,
  InMemoryEmergencyContactRepository,
  InMemoryInventoryRepository,
  InMemoryLeaveApprovalRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  InMemoryRoleAssignmentRepository,
  createInMemoryDepartmentRepository,
  createInMemoryEmployeeRepository,
  createInMemoryLeaveTypeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

let server;
let base;
let token;

before(async () => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  const leaveTypeRepository = createInMemoryLeaveTypeRepository();
  const leaveBalanceRepository = new InMemoryLeaveBalanceRepository();
  const leaveRequestRepository = new InMemoryLeaveRequestRepository();
  const itemRepository = new InMemoryInventoryRepository();
  const emergencyContactRepository = new InMemoryEmergencyContactRepository();

  const app = createApp({
    authUseCases: createAuthUseCases({
      administratorRepository,
      passwordHasher: new BcryptPasswordHasher(4),
      tokenService: new JwtTokenService({ accessSecret: "a", refreshSecret: "r", accessTtl: "15m", refreshTtl: "7d" }),
    }),
    employeeUseCases: createEmployeeUseCases({
      employeeRepository,
      leaveBalanceRepository,
      leaveRequestRepository,
      itemRepository,
      emergencyContactRepository,
      passwordHasher: new BcryptPasswordHasher(4),
    }),
    emergencyContactUseCases: createEmergencyContactUseCases({ emergencyContactRepository, employeeRepository }),
    departmentUseCases: createDepartmentUseCases({ departmentRepository: createInMemoryDepartmentRepository() }),
    roleUseCases: createRoleUseCases({ roleRepository, roleAssignmentRepository }),
    roleAssignmentUseCases: createRoleAssignmentUseCases({ roleAssignmentRepository, roleRepository, administratorRepository }),
    leaveTypeUseCases: createLeaveTypeUseCases({ leaveTypeRepository, leaveBalanceRepository, leaveRequestRepository }),
    leaveBalanceUseCases: createLeaveBalanceUseCases({ leaveBalanceRepository, employeeRepository, leaveTypeRepository }),
    leaveRequestUseCases: createLeaveRequestUseCases({
      leaveRequestRepository,
      leaveApprovalRepository: new InMemoryLeaveApprovalRepository(),
      leaveBalanceRepository,
      employeeRepository,
      leaveTypeRepository,
      administratorRepository,
    }),
    administratorUseCases: createAdministratorUseCases({ administratorRepository }),
    inventoryUseCases: createInventoryUseCases({ itemRepository, employeeRepository }),
    dashboardUseCases: createDashboardUseCases({ employeeRepository, leaveRequestRepository }),
  });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://localhost:${server.address().port}`;

  await administratorRepository.create({
    username: "alice",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
    passwordHash: await new BcryptPasswordHasher(4).hash("pass-word1!"),
  });
  token = (await call("POST", "/admin/login", { body: { username: "alice", password: "pass-word1!" } })).body.token;
});

after(() => server.close());

const call = async (method, path, { body, auth = true } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(auth && token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
};

const employee = {
  first_name: "Ann",
  last_name: "Lee",
  email: "ann@example.com",
  position: "Accountant",
  department: "Finance and Accounting",
  salary: "5000",
};

const contact = {
  firstName: "Maria",
  lastName: "Santos",
  relationship: "Mother",
  email: "Maria@Example.com",
  address: "12 Rizal Street, Manila",
  phoneNumber: "+63 917 123 4567",
};

const addEmployee = async (email) => (await call("POST", "/employees/", { body: { ...employee, email } })).body;

test("an employee has many emergency contacts, listed under the employee", async () => {
  const ann = await addEmployee("many@example.com");
  const bea = await addEmployee("other@example.com");

  const first = await call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: ann._id } });
  assert.equal(first.status, 200);
  assert.equal(first.body.email, "maria@example.com"); // stored in lower case
  assert.equal(
    (await call("POST", "/emergency-contacts/", { body: { ...contact, firstName: "Jose", employeeId: ann._id } })).status,
    200
  );
  await call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: bea._id } });

  const mine = await call("GET", `/employees/${ann._id}/emergency-contacts`);
  assert.equal(mine.body.count, 2);
  assert.ok(mine.body.data.every((c) => c.employeeId === ann._id));
  assert.equal((await call("GET", "/employees/000000000000000000008888/emergency-contacts")).status, 404);
});

test("emergency contacts need a signed-in administrator", async () => {
  assert.equal((await call("GET", "/emergency-contacts/", { auth: false })).status, 401);
});

test("a contact needs an existing employee and the required fields", async () => {
  const post = (body) => call("POST", "/emergency-contacts/", { body });
  const ann = await addEmployee("required@example.com");

  assert.equal((await post(contact)).status, 400); // no employeeId
  assert.equal((await post({ ...contact, employeeId: "000000000000000000008888" })).status, 400);
  assert.equal((await post({ ...contact, employeeId: ann._id, phoneNumber: undefined })).status, 400);
  assert.equal((await post({ ...contact, employeeId: ann._id, phoneNumber: "abc" })).status, 400);
  assert.equal((await post({ ...contact, employeeId: ann._id, email: "not-an-email" })).status, 400);

  const optional = await post({ ...contact, employeeId: ann._id, email: "", address: "" });
  assert.equal(optional.status, 200);
});

test("contact names must be at least 2 letters and letters only", async () => {
  const ann = await addEmployee("names@example.com");
  const post = (extra) => call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: ann._id, ...extra } });

  const short = await post({ firstName: "M" });
  assert.equal(short.status, 400);
  assert.match(short.body.message, /at least 2/);

  for (const bad of ["Maria3", "Ma_ria", "Maria!", "-Maria", "Mary Ann", "Dela-Cruz", "O'Brien", "M@ria"]) {
    const result = await post({ lastName: bad });
    assert.equal(result.status, 400, `${bad} should be refused`);
    assert.match(result.body.message, /letters only/);
  }

  for (const good of ["Peña", "SANTOS", "  Santos  "]) {
    assert.equal((await post({ lastName: good })).status, 200, `${good} should be accepted`);
  }
});

test("employee names follow the same rule", async () => {
  const post = (extra) => call("POST", "/employees/", { body: { ...employee, email: `${Math.random()}@example.com`, ...extra } });

  assert.equal((await post({ first_name: "A" })).status, 400);
  assert.equal((await post({ last_name: "Lee2" })).status, 400);
  assert.equal((await post({ first_name: "Ann-Marie" })).status, 400);
  assert.equal((await post({ first_name: "Annmarie" })).status, 200);

  const missing = await post({ first_name: undefined });
  assert.equal(missing.status, 400);
  assert.match(missing.body.message, /required fields/); // presence is still the use case's message

  const ann = await addEmployee("update-names@example.com");
  const put = (extra) => call("PUT", `/employees/${ann._id}`, { body: { ...employee, email: "update-names@example.com", ...extra } });
  assert.equal((await put({ first_name: "4nn" })).status, 400);
  assert.equal((await put({ first_name: "Anna" })).status, 200);
});

test("a contact can be changed, but not moved to another employee", async () => {
  const ann = await addEmployee("update@example.com");
  const bea = await addEmployee("update-other@example.com");
  const made = await call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: ann._id } });

  const put = await call("PUT", `/emergency-contacts/${made.body._id}`, {
    body: { ...contact, employeeId: bea._id, relationship: "Aunt" },
  });
  assert.equal(put.status, 200);

  const stored = (await call("GET", `/emergency-contacts/${made.body._id}`)).body;
  assert.equal(stored.relationship, "Aunt");
  assert.equal(stored.employeeId, ann._id);

  assert.equal((await call("PUT", `/emergency-contacts/${made.body._id}`, { body: { ...contact, firstName: "X" } })).status, 400);
  assert.equal((await call("PUT", "/emergency-contacts/000000000000000000008888", { body: contact })).status, 404);
});

test("deleting a contact, and deleting an employee, removes their contacts", async () => {
  const ann = await addEmployee("delete@example.com");
  const made = await call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: ann._id } });

  assert.equal((await call("DELETE", `/emergency-contacts/${made.body._id}`)).status, 200);
  assert.equal((await call("DELETE", `/emergency-contacts/${made.body._id}`)).status, 404);

  await call("POST", "/emergency-contacts/", { body: { ...contact, employeeId: ann._id } });
  assert.equal((await call("DELETE", `/employees/${ann._id}`)).status, 200);
  const all = (await call("GET", "/emergency-contacts/")).body.data;
  assert.ok(all.every((c) => c.employeeId !== ann._id));
});
