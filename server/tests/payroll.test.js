// The HR payroll report: gross pay per employee for a period, worked out from each day's attendance
// record. Real permission middleware and route, in-memory repositories, a stand-in sign-in header.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createPayrollUseCases } from "../src/application/payroll/payrollUseCases.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createPayrollRouter } from "../src/presentation/http/routes/payrollRoutes.js";
import { createRequirePermission } from "../src/presentation/http/middleware/permissionMiddleware.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { assertValidPeriod, buildPayroll, rateInForce } from "../src/domain/payroll/payrollRules.js";
import { ValidationError } from "../src/domain/errors.js";
import {
  InMemoryAttendanceRepository,
  InMemoryRoleAssignmentRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

const HR = "000000000000000000000b01";
const CLERK = "000000000000000000000b02";

let server;
let base;
let portalUser;
let idleEmployee;

const workday = (employeeId, date, { hours = 8, rate = 25000, lateMinutes = 0 } = {}) => ({
  employeeId,
  date,
  timeIn: new Date(`${date}T00:00:00.000Z`),
  timeOut: new Date(`${date}T09:00:00.000Z`),
  hourlyRate: rate,
  hoursWorked: hours,
  lateMinutes,
});

before(async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const attendanceRepository = new InMemoryAttendanceRepository();
  const salaryRateRepository = new InMemorySalaryRateRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();

  portalUser = await employeeRepository.create({ first_name: "Portal", last_name: "User", email: "user@gallium31.com", position: "Staff" });
  idleEmployee = await employeeRepository.create({ first_name: "Idle", last_name: "Person", email: "idle@example.com", position: "Staff" });

  await salaryRateRepository.create({ employeeId: portalUser.id, hourlyRate: 25000, effectiveFrom: "2026-11-01", assignedBy: HR });
  for (const date of ["2026-11-02", "2026-11-03", "2026-11-04"]) {
    await attendanceRepository.create(workday(portalUser.id, date, { lateMinutes: date === "2026-11-03" ? 10 : 0 }));
  }
  await attendanceRepository.create(workday(portalUser.id, "2026-11-20")); // outside the period

  const grant = async (administratorId, role) => {
    const stored = await roleRepository.create(role);
    await roleAssignmentRepository.create({ administratorId, roleId: stored.id });
  };
  await grant(HR, { name: "HR", permissions: ["salary-rates:view", "salary-rates:assign"] });
  await grant(CLERK, { name: "Clerk", permissions: ["employees:view"] });

  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    const id = req.headers["x-admin"];
    if (!id) return res.status(401).json({ message: "Sign in" });
    req.user = { id };
    next();
  };
  app.use(
    "/payroll",
    createPayrollRouter({
      payrollUseCases: createPayrollUseCases({ employeeRepository, attendanceRepository, salaryRateRepository }),
      requireAuth,
      requirePermission: createRequirePermission(createAuthorizationUseCases({ roleAssignmentRepository, roleRepository })),
    })
  );
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const get = async (path, as) => {
  const response = await fetch(base + path, { headers: as ? { "x-admin": as } : {} });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test("only HR (salary-rates:view) can open the payroll report", async () => {
  const path = "/payroll?from=2026-11-01&to=2026-11-15";
  assert.equal((await get(path)).status, 401, "not signed in");
  assert.equal((await get(path, CLERK)).status, 403, "role without it");
  assert.equal((await get(path, "000000000000000000000fff")).status, 403, "no role at all");
  assert.equal((await get(path, HR)).status, 200);
});

test("the report shows the hourly rate, hours and gross pay for the period only", async () => {
  const { body } = await get("/payroll?from=2026-11-01&to=2026-11-15", HR);

  const row = body.data.find((r) => r.employeeId === portalUser.id);
  assert.equal(row.email, "user@gallium31.com");
  assert.equal(row.hourlyRate, 25000);
  assert.equal(row.daysWorked, 3, "the record on Nov 20 is outside the period");
  assert.equal(row.hoursWorked, 24);
  assert.equal(row.grossPay, 600000);
  assert.equal(row.lateMinutes, 10);
  assert.deepEqual(row.days.map((d) => d.date), ["2026-11-02", "2026-11-03", "2026-11-04"]);
  assert.equal(row.days[0].pay, 200000);

  const idle = body.data.find((r) => r.employeeId === idleEmployee.id);
  assert.equal(idle.hourlyRate, null, "no rate assigned");
  assert.equal(idle.grossPay, 0);

  assert.deepEqual(body.totals, { employees: 2, hoursWorked: 24, grossPay: 600000 });
});

test("a bad period is rejected", async () => {
  assert.equal((await get("/payroll", HR)).status, 400);
  assert.equal((await get("/payroll?from=2026-11-15&to=2026-11-01", HR)).status, 400);
  assert.equal((await get("/payroll?from=2026-02-30&to=2026-03-05", HR)).status, 400);
  assert.equal((await get("/payroll?from=2026-01-01&to=2026-12-31", HR)).status, 400, "longer than a quarter");
});

test("each day is paid at the rate it was earned at, so a raise does not rewrite earlier days", () => {
  const employee = { id: "e1", first_name: "A", last_name: "B", email: "a@b.c", position: "x" };
  const report = buildPayroll({
    employees: [employee],
    attendance: [
      workday("e1", "2026-11-02", { rate: 100, hours: 8 }),
      workday("e1", "2026-11-03", { rate: 150, hours: 8 }),
    ],
    rates: [
      { employeeId: "e1", hourlyRate: 100, effectiveFrom: "2026-01-01" },
      { employeeId: "e1", hourlyRate: 150, effectiveFrom: "2026-11-03" },
    ],
    from: "2026-11-01",
    to: "2026-11-15",
  });
  assert.equal(report.data[0].grossPay, 2000);
  assert.equal(report.data[0].hourlyRate, 150, "the rate in force at the end of the period");
});

test("a day still timed in earns nothing yet, and an inactive employee only shows with records", () => {
  const active = { id: "e1", first_name: "A", last_name: "B", email: "a@b.c", position: "x" };
  const gone = { id: "e2", first_name: "C", last_name: "D", email: "c@d.e", position: "x", isActive: false };
  const open = { ...workday("e1", "2026-11-02"), timeOut: null, hoursWorked: null };
  const report = buildPayroll({ employees: [active, gone], attendance: [open], rates: [], from: "2026-11-01", to: "2026-11-15" });

  assert.equal(report.data.length, 1, "the inactive employee has no records");
  assert.equal(report.data[0].daysWorked, 0);
  assert.equal(report.data[0].grossPay, 0);
});

test("period and rate helpers", () => {
  assert.doesNotThrow(() => assertValidPeriod({ from: "2026-11-01", to: "2026-11-15" }));
  assert.throws(() => assertValidPeriod({ from: "nope", to: "2026-11-15" }), ValidationError);
  assert.equal(rateInForce([], "2026-11-01"), null);
  assert.equal(rateInForce([{ hourlyRate: 5, effectiveFrom: "2026-12-01" }], "2026-11-01"), null, "starts later");
});
