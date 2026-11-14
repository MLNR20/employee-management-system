// An employee can have a manager, who is another employee: who qualifies, loops, direct reports, and
// what happens when a manager is deleted. Real employee routes and use cases over in-memory repositories.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import { createEmployeeRouter } from "../src/presentation/http/routes/employeeRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

let server;
let base;
let employeeRepository;

before(async () => {
  employeeRepository = createInMemoryEmployeeRepository();
  const employeeUseCases = createEmployeeUseCases({
    employeeRepository,
    leaveBalanceRepository: new InMemoryLeaveBalanceRepository(),
    leaveRequestRepository: new InMemoryLeaveRequestRepository(),
  });

  const app = express();
  app.use(express.json());
  app.use(
    "/employees",
    createEmployeeRouter({
      employeeUseCases,
      leaveBalanceUseCases: {},
      leaveRequestUseCases: {},
      requireAuth: (req, res, next) => next(),
    })
  );
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, body) => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

let counter = 0;
const person = (first, extra = {}) => ({
  first_name: first,
  last_name: "Test",
  email: `${first.toLowerCase()}${++counter}@example.com`,
  position: "Staff",
  department: "Ops",
  salary: 1000,
  ...extra,
});
const hire = async (first, extra) => (await call("POST", "/employees/", person(first, extra))).body;
const managerOf = async (id) => (await call("GET", `/employees/${id}`)).body.managerId;

test("an employee can be hired with a manager, or with none", async () => {
  const boss = await hire("Boss");
  assert.equal(boss.managerId, null, "no manager by default");

  const report = await call("POST", "/employees/", person("Report", { managerId: boss._id }));
  assert.equal(report.status, 200);
  assert.equal(report.body.managerId, boss._id);
  assert.equal(await managerOf(report.body._id), boss._id);

  const blank = await call("POST", "/employees/", person("Blank", { managerId: "" }));
  assert.equal(blank.status, 200);
  assert.equal(blank.body.managerId, null);

  const listed = (await call("GET", "/employees/")).body.data.find((e) => e._id === report.body._id);
  assert.equal(listed.managerId, boss._id);
});

test("a manager must be an existing, active employee", async () => {
  const gone = await hire("Gone", { isActive: false });

  assert.equal((await call("POST", "/employees/", person("A", { managerId: "000000000000000000009999" }))).status, 400);
  assert.equal((await call("POST", "/employees/", person("B", { managerId: "nope" }))).status, 400);
  assert.equal((await call("POST", "/employees/", person("C", { managerId: 42 }))).status, 400);
  assert.equal((await call("POST", "/employees/", person("D", { managerId: gone._id }))).status, 400, "inactive manager");
});

test("changing a manager: set, keep, clear, and never yourself", async () => {
  const boss = await hire("Chief");
  const other = await hire("Other");
  const worker = await hire("Worker");
  const put = (body) => call("PUT", `/employees/${worker._id}`, { ...person("Worker"), ...body });

  assert.equal((await put({ managerId: boss._id })).status, 200);
  assert.equal(await managerOf(worker._id), boss._id);

  // Leaving the field out keeps the current manager.
  assert.equal((await put({})).status, 200);
  assert.equal(await managerOf(worker._id), boss._id);

  assert.equal((await put({ managerId: other._id })).status, 200);
  assert.equal(await managerOf(worker._id), other._id);

  // A blank manager clears it.
  assert.equal((await put({ managerId: "" })).status, 200);
  assert.equal(await managerOf(worker._id), null);

  const self = await put({ managerId: worker._id });
  assert.equal(self.status, 400);
  assert.match(self.body.message, /own manager/);
});

test("the reporting line cannot loop, directly or through others", async () => {
  const a = await hire("Alpha");
  const b = await hire("Bravo", { managerId: a._id }); // Bravo reports to Alpha
  const c = await hire("Charlie", { managerId: b._id }); // Charlie reports to Bravo
  const put = (employee, managerId) => call("PUT", `/employees/${employee._id}`, { ...person(employee.first_name), managerId });

  const direct = await put(a, b._id);
  assert.equal(direct.status, 400, "Alpha cannot report to their own report");
  assert.match(direct.body.message, /already reports to this employee/);

  assert.equal((await put(a, c._id)).status, 400, "nor to someone further down the line");
  assert.equal(await managerOf(a._id), null, "nothing changed");

  // Moving sideways or up is fine.
  assert.equal((await put(c, a._id)).status, 200);
  assert.equal(await managerOf(c._id), a._id);
});

test("direct reports", async () => {
  const boss = await hire("Lead");
  const zed = await hire("Zed", { managerId: boss._id });
  const amy = await hire("Amy", { managerId: boss._id });
  await hire("Loner");

  const reports = await call("GET", `/employees/${boss._id}/direct-reports`);
  assert.equal(reports.status, 200);
  assert.equal(reports.body.count, 2);
  assert.deepEqual(reports.body.data.map((e) => e._id).sort(), [amy._id, zed._id].sort());

  assert.equal((await call("GET", `/employees/${zed._id}/direct-reports`)).body.count, 0);
  assert.equal((await call("GET", "/employees/nope/direct-reports")).status, 404);
});

test("a manager cannot be deleted until their people have another manager", async () => {
  const boss = await hire("Retiring");
  const heir = await hire("Heir");
  const report = await hire("Junior", { managerId: boss._id });

  const refused = await call("DELETE", `/employees/${boss._id}`);
  assert.equal(refused.status, 409);
  assert.match(refused.body.message, /manages other employees/);
  assert.equal((await call("GET", `/employees/${boss._id}`)).status, 200, "still there");

  await call("PUT", `/employees/${report._id}`, { ...person("Junior"), managerId: heir._id });
  assert.equal((await call("DELETE", `/employees/${boss._id}`)).status, 200);
  assert.equal((await call("GET", `/employees/${boss._id}`)).status, 404);

  // Someone who manages nobody can always go (absent other history).
  assert.equal((await call("DELETE", `/employees/${report._id}`)).status, 200);
});
