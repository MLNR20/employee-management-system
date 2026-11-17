// Employment types (Regular, Contractual...): CRUD, and assigning one to an employee,
// driven over HTTP against in-memory repositories.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/presentation/http/app.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import { createEmploymentTypeUseCases } from "../src/application/employmentType/employmentTypeUseCases.js";
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
  InMemoryInventoryRepository,
  InMemoryLeaveApprovalRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  InMemoryRoleAssignmentRepository,
  createInMemoryDepartmentRepository,
  createInMemoryEmployeeRepository,
  createInMemoryEmploymentTypeRepository,
  createInMemoryLeaveTypeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

let server;
let base;
let token;
let employmentTypeRepository;

before(async () => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  employmentTypeRepository = createInMemoryEmploymentTypeRepository();
  const leaveTypeRepository = createInMemoryLeaveTypeRepository();
  const leaveBalanceRepository = new InMemoryLeaveBalanceRepository();
  const leaveRequestRepository = new InMemoryLeaveRequestRepository();
  const itemRepository = new InMemoryInventoryRepository();

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
      employmentTypeRepository,
      passwordHasher: new BcryptPasswordHasher(4),
    }),
    employmentTypeUseCases: createEmploymentTypeUseCases({ employmentTypeRepository }),
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

  await call("POST", "/admin/register", {
    body: { username: "alice", password: "pass-word1!", first_name: "Alice", last_name: "Smith", email: "alice@example.com" },
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

const addType = async (name, extra = {}) => (await call("POST", "/employment-types/", { body: { name, ...extra } })).body;

test("employment types need a signed-in administrator", async () => {
  assert.equal((await call("GET", "/employment-types/", { auth: false })).status, 401);
});

test("an employment type has a name, dates and an active flag", async () => {
  const created = await call("POST", "/employment-types/", { body: { name: "Regular", description: "Permanent staff" } });
  assert.equal(created.status, 200);
  assert.equal(created.body.name, "Regular");
  assert.equal(created.body.isActive, true);
  assert.ok(created.body.dateCreated);
  assert.ok(created.body.dateUpdated);

  const fetched = await call("GET", `/employment-types/${created.body._id}`);
  assert.equal(fetched.body.description, "Permanent staff");
});

test("a name is required and duplicates are refused", async () => {
  assert.equal((await call("POST", "/employment-types/", { body: { description: "no name" } })).status, 400);
  await addType("Probationary");
  assert.equal((await call("POST", "/employment-types/", { body: { name: "Probationary" } })).status, 409);
});

test("an employment type can be edited and marked inactive", async () => {
  const type = await addType("Seasonal");
  const update = await call("PUT", `/employment-types/${type._id}`, {
    body: { name: "Seasonal worker", description: "Peak months", isActive: false },
  });
  assert.equal(update.status, 200);

  const after = (await call("GET", `/employment-types/${type._id}`)).body;
  assert.equal(after.name, "Seasonal worker");
  assert.equal(after.isActive, false);
});

test("deleting is a soft delete that hides the type and frees its name", async () => {
  const type = await addType("Intern");
  assert.equal((await call("DELETE", `/employment-types/${type._id}`)).status, 200);

  // Gone from every read and write...
  assert.equal((await call("GET", `/employment-types/${type._id}`)).status, 404);
  assert.equal((await call("GET", "/employment-types/")).body.data.some((t) => t._id === type._id), false);
  assert.equal((await call("GET", "/employment-types/?page=1&pageSize=100")).body.data.some((t) => t._id === type._id), false);
  assert.equal((await call("PUT", `/employment-types/${type._id}`, { body: { name: "Revived" } })).status, 404);
  assert.equal((await call("DELETE", `/employment-types/${type._id}`)).status, 404, "already deleted");

  // ...but the row is still there, marked deleted and inactive.
  const kept = await employmentTypeRepository.findByIdIncludingDeleted(type._id);
  assert.ok(kept.deletedAt instanceof Date);
  assert.equal(kept.isActive, false);

  // Its name can be used again by a new type.
  const again = await call("POST", "/employment-types/", { body: { name: "intern" } });
  assert.equal(again.status, 200);
  assert.notEqual(again.body._id, type._id);
});

test("names clash whatever the capitalisation, and renaming onto another name is refused", async () => {
  await addType("Part-time");
  assert.equal((await call("POST", "/employment-types/", { body: { name: " part-TIME " } })).status, 409);

  const other = await addType("Casual");
  assert.equal((await call("PUT", `/employment-types/${other._id}`, { body: { name: "Part-time" } })).status, 409);
  assert.equal((await call("PUT", `/employment-types/${other._id}`, { body: { name: "casual", description: "x" } })).status, 200);
});

test("an employment type can be assigned to an employee, changed and cleared", async () => {
  const regular = await addType("Regular full-time");
  const contract = await addType("Contractual");

  const created = await call("POST", "/employees/", {
    body: { ...employee, email: "assign@example.com", employmentTypeId: regular._id },
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.employmentTypeId, regular._id);

  const id = created.body._id;
  await call("PUT", `/employees/${id}`, { body: { ...employee, email: "assign@example.com", employmentTypeId: contract._id } });
  assert.equal((await call("GET", `/employees/${id}`)).body.employmentTypeId, contract._id);

  await call("PUT", `/employees/${id}`, { body: { ...employee, email: "assign@example.com", employmentTypeId: "" } });
  assert.equal((await call("GET", `/employees/${id}`)).body.employmentTypeId, null);
});

test("an employee cannot be given an employment type that does not exist or is inactive", async () => {
  const missing = await call("POST", "/employees/", {
    body: { ...employee, email: "ghost@example.com", employmentTypeId: "0".repeat(24) },
  });
  assert.equal(missing.status, 400);

  const retired = await addType("Retired type", { isActive: false });
  const inactive = await call("POST", "/employees/", {
    body: { ...employee, email: "retired@example.com", employmentTypeId: retired._id },
  });
  assert.equal(inactive.status, 400);
});

test("an employee keeps an employment type that was later marked inactive", async () => {
  const type = await addType("Phased out");
  const created = (await call("POST", "/employees/", {
    body: { ...employee, email: "keeps@example.com", employmentTypeId: type._id },
  })).body;

  await call("PUT", `/employment-types/${type._id}`, { body: { name: "Phased out", isActive: false } });

  const resave = await call("PUT", `/employees/${created._id}`, {
    body: { ...employee, email: "keeps@example.com", position: "Senior Accountant", employmentTypeId: type._id },
  });
  assert.equal(resave.status, 200);
});

test("a deleted employment type cannot be assigned, but employees who hold it keep it", async () => {
  const type = await addType("Fixed term");
  const holder = (await call("POST", "/employees/", {
    body: { ...employee, email: "holder@example.com", employmentTypeId: type._id },
  })).body;

  assert.equal((await call("DELETE", `/employment-types/${type._id}`)).status, 200);

  // The holder keeps it, and can be saved again with it.
  assert.equal((await call("GET", `/employees/${holder._id}`)).body.employmentTypeId, type._id);
  const resave = await call("PUT", `/employees/${holder._id}`, {
    body: { ...employee, email: "holder@example.com", position: "Senior Accountant", employmentTypeId: type._id },
  });
  assert.equal(resave.status, 200);

  // Nobody else can be given it.
  const other = await call("POST", "/employees/", {
    body: { ...employee, email: "latecomer@example.com", employmentTypeId: type._id },
  });
  assert.equal(other.status, 400);

  // The holder can still be moved off it, and then cannot go back.
  const regular = await addType("Moved-to type");
  await call("PUT", `/employees/${holder._id}`, { body: { ...employee, email: "holder@example.com", employmentTypeId: regular._id } });
  const back = await call("PUT", `/employees/${holder._id}`, {
    body: { ...employee, email: "holder@example.com", employmentTypeId: type._id },
  });
  assert.equal(back.status, 400);
});
