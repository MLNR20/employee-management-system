// "What may I do?" for the signed-in administrator, and the end-to-end rule that the hourly rate in
// attendance records follows it: HR sees the rate, a clerk never does. Real authorization use cases
// and routes, in-memory repositories, and a stand-in sign-in that reads the administrator from a header.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createAttendanceUseCases } from "../src/application/attendance/attendanceUseCases.js";
import { createRoleRouter } from "../src/presentation/http/routes/hrRoutes.js";
import { createAttendanceRouter } from "../src/presentation/http/routes/attendanceRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  InMemoryAttendanceRepository,
  InMemoryRoleAssignmentRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

const HR = "000000000000000000000b01";
const CLERK = "000000000000000000000b02";
const INACTIVE_HR = "000000000000000000000b03";
const NOBODY = "000000000000000000000b04";

let server;
let base;
let employeeId;

before(async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const authorizationUseCases = createAuthorizationUseCases({ roleAssignmentRepository, roleRepository });

  const grant = async (administratorId, role) => {
    const stored = await roleRepository.create(role);
    await roleAssignmentRepository.create({ administratorId, roleId: stored.id });
  };
  await grant(HR, { name: "HR", permissions: ["attendance:view", "salary-rates:view", "salary-rates:assign"] });
  await grant(CLERK, { name: "Clerk", permissions: ["attendance:view"] });
  await grant(INACTIVE_HR, { name: "Old HR", isActive: false, permissions: ["salary-rates:view"] });

  employeeId = (
    await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com", salary: 17600 })
  ).id;
  const attendanceUseCases = createAttendanceUseCases({
    attendanceRepository: new InMemoryAttendanceRepository(),
    employeeRepository,
    salaryRateRepository: new InMemorySalaryRateRepository(),
    now: () => new Date("2026-03-02T08:00:00.000Z"),
  });

  const requireAuth = (req, res, next) => {
    req.user = { id: req.headers["x-admin"] };
    next();
  };
  const canViewRates = (req) => authorizationUseCases.hasPermission(req.user.id, "salary-rates:view");

  const app = express();
  app.use(express.json());
  app.use("/roles", createRoleRouter({ roleUseCases: {}, requireAuth, authorizationUseCases }));
  app.use("/attendance", createAttendanceRouter({ attendanceUseCases, requireAuth, canViewRates }));
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, { as, body } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", "x-admin": as },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test("/roles/mine lists the permissions of the administrator's active roles", async () => {
  const hr = await call("GET", "/roles/mine", { as: HR });
  assert.deepEqual(hr.body.data.sort(), ["attendance:view", "salary-rates:assign", "salary-rates:view"]);
  assert.deepEqual((await call("GET", "/roles/mine", { as: CLERK })).body.data, ["attendance:view"]);
  assert.deepEqual((await call("GET", "/roles/mine", { as: INACTIVE_HR })).body.data, [], "inactive role grants nothing");
  assert.deepEqual((await call("GET", "/roles/mine", { as: NOBODY })).body.data, []);
});

test("attendance shows the hourly rate to HR only", async () => {
  const created = await call("POST", "/attendance/time-in", { as: CLERK, body: { employeeId } });
  assert.equal(created.status, 200);
  assert.equal("hourlyRate" in created.body, false, "the clerk who timed the employee in does not get the rate");

  for (const as of [CLERK, INACTIVE_HR, NOBODY]) {
    const list = await call("GET", "/attendance/", { as });
    assert.equal(list.body.count, 1);
    assert.equal("hourlyRate" in list.body.data[0], false);
    assert.equal("hourlyRate" in (await call("GET", `/attendance/${created.body._id}`, { as })).body, false);
  }

  assert.equal((await call("GET", "/attendance/", { as: HR })).body.data[0].hourlyRate, 100);
  assert.equal((await call("GET", `/attendance/${created.body._id}`, { as: HR })).body.hourlyRate, 100);
});
