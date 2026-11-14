// Time in / lunch out / lunch in / time out, the hourly rate taken at time in, and the hours worked.
// Use cases run against in-memory repositories with a fixed clock; the routes run on a small Express app.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createAttendanceUseCases } from "../src/application/attendance/attendanceUseCases.js";
import { createAttendanceRouter } from "../src/presentation/http/routes/attendanceRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { computeHoursWorked, hourlyRateFromSalary } from "../src/domain/attendance/attendanceRules.js";
import { InvalidStateError, NotFoundError, ValidationError } from "../src/domain/errors.js";
import {
  InMemoryAttendanceRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const at = (time, day = "2026-03-02") => new Date(`${day}T${time}:00.000Z`);

const setup = async () => {
  let current = at("08:00");
  const employeeRepository = createInMemoryEmployeeRepository();
  const attendanceRepository = new InMemoryAttendanceRepository();
  const salaryRateRepository = new InMemorySalaryRateRepository();
  const useCases = createAttendanceUseCases({
    attendanceRepository,
    employeeRepository,
    salaryRateRepository,
    now: () => current,
  });

  const employee = await employeeRepository.create({
    first_name: "Ann",
    last_name: "Lee",
    email: "ann@example.com",
    salary: 17600, // 17600 / 22 days / 8 hours = 100 an hour
  });

  return { useCases, employee, employeeRepository, salaryRateRepository, setNow:(time, day) => (current = at(time, day)) };
};

test("hours worked are time in to time out, less lunch", () => {
  const base = { timeIn: at("08:00"), timeOut: at("17:00") };
  assert.equal(computeHoursWorked(base), 9);
  assert.equal(computeHoursWorked({ ...base, lunchOut: at("12:00"), lunchIn: at("13:00") }), 8);
  assert.equal(computeHoursWorked({ ...base, lunchOut: at("12:00"), lunchIn: at("12:45") }), 8.25);
  assert.equal(computeHoursWorked({ timeIn: at("08:00") }), null, "still timed in");
  assert.equal(computeHoursWorked({ ...base, lunchOut: at("12:00") }), 9, "lunch not finished is not subtracted");
});

test("hourly rate comes from the monthly salary", () => {
  assert.equal(hourlyRateFromSalary(17600), 100);
  assert.equal(hourlyRateFromSalary("5000"), 28.41);
  assert.equal(hourlyRateFromSalary(undefined), null);
  assert.equal(hourlyRateFromSalary("abc"), null);
});

test("a full day: time in captures the rate, time out works out the hours", async () => {
  const { useCases, employee, setNow } = await setup();

  const record = await useCases.timeIn(employee.id);
  assert.equal(record.employeeId, employee.id);
  assert.equal(record.date, "2026-03-02");
  assert.deepEqual(record.timeIn, at("08:00"));
  assert.equal(record.hourlyRate, 100);
  assert.equal(record.timeOut, null);
  assert.equal(record.hoursWorked, null);

  setNow("12:00");
  assert.deepEqual((await useCases.lunchOut(employee.id)).lunchOut, at("12:00"));
  setNow("12:30");
  assert.deepEqual((await useCases.lunchIn(employee.id)).lunchIn, at("12:30"));
  setNow("17:00");
  const done = await useCases.timeOut(employee.id);

  assert.deepEqual(done.timeOut, at("17:00"));
  assert.equal(done.hoursWorked, 8.5);
  assert.equal(done.hourlyRate, 100);
});

test("a day without lunch is fine", async () => {
  const { useCases, employee, setNow } = await setup();
  await useCases.timeIn(employee.id);
  setNow("12:00");
  const done = await useCases.timeOut(employee.id);
  assert.equal(done.hoursWorked, 4);
  assert.equal(done.lunchOut, null);
});

test("the rate is a snapshot: a later raise does not change an earlier day", async () => {
  const { useCases, employee, employeeRepository, setNow } = await setup();
  await useCases.timeIn(employee.id);
  setNow("17:00");
  const first = await useCases.timeOut(employee.id);

  await employeeRepository.update(employee.id, { salary: 35200 });
  setNow("08:00", "2026-03-03");
  const second = await useCases.timeIn(employee.id);

  assert.equal(second.hourlyRate, 200);
  assert.equal((await useCases.getAttendance(first.id)).hourlyRate, 100);
});

test("time in uses the rate HR assigned for that day, not one sent with the request", async () => {
  const { useCases, employee, salaryRateRepository, setNow } = await setup();

  // A rate starting later does not apply yet; the salary-derived rate does.
  await salaryRateRepository.create({ employeeId: employee.id, hourlyRate: 150, effectiveFrom: "2026-03-03" });
  const first = await useCases.timeIn(employee.id);
  assert.equal(first.hourlyRate, 100);
  setNow("17:00");
  await useCases.timeOut(employee.id);

  // The next day the assigned rate is in force.
  setNow("08:00", "2026-03-03");
  assert.equal((await useCases.timeIn(employee.id)).hourlyRate, 150);

  // Nothing an administrator sends can override it, on a manual entry or a correction.
  const manual = await useCases.addAttendance({
    employeeId: employee.id,
    timeIn: "2026-03-04T08:00:00.000Z",
    hourlyRate: 9999,
  });
  assert.equal(manual.hourlyRate, 150);
  assert.equal((await useCases.updateAttendance(manual.id, { hourlyRate: 1 })).hourlyRate, 150);
});

test("an employee with no salary and no assigned rate cannot time in", async () => {
  const { useCases, employeeRepository, salaryRateRepository } = await setup();
  const unpaid = await employeeRepository.create({ first_name: "No", last_name: "Pay", email: "np@example.com" });

  await assert.rejects(useCases.timeIn(unpaid.id), ValidationError);

  await salaryRateRepository.create({ employeeId: unpaid.id, hourlyRate: 90, effectiveFrom: "2026-01-01" });
  assert.equal((await useCases.timeIn(unpaid.id)).hourlyRate, 90);
});

test("the steps must come in order", async () => {
  const { useCases, employee, setNow } = await setup();

  await assert.rejects(useCases.timeOut(employee.id), InvalidStateError); // not timed in
  await assert.rejects(useCases.lunchOut(employee.id), InvalidStateError);

  await useCases.timeIn(employee.id);
  await assert.rejects(useCases.timeIn(employee.id), InvalidStateError); // twice
  await assert.rejects(useCases.lunchIn(employee.id), InvalidStateError); // no lunch out yet

  setNow("12:00");
  await useCases.lunchOut(employee.id);
  await assert.rejects(useCases.lunchOut(employee.id), InvalidStateError);
  await assert.rejects(useCases.timeOut(employee.id), InvalidStateError); // still at lunch

  setNow("12:30");
  await useCases.lunchIn(employee.id);
  await assert.rejects(useCases.lunchIn(employee.id), InvalidStateError);

  setNow("17:00");
  await useCases.timeOut(employee.id);
  await assert.rejects(useCases.timeOut(employee.id), InvalidStateError);

  // One record a day: timing in again the same day is refused, the next day is fine.
  await assert.rejects(useCases.timeIn(employee.id), InvalidStateError);
  setNow("08:00", "2026-03-03");
  await useCases.timeIn(employee.id);
});

test("an unknown, inactive or malformed employee cannot time in", async () => {
  const { useCases, employee, employeeRepository } = await setup();
  await assert.rejects(useCases.timeIn("nope"), NotFoundError);
  await assert.rejects(useCases.timeIn(undefined), NotFoundError);

  await employeeRepository.update(employee.id, { isActive: false });
  await assert.rejects(useCases.timeIn(employee.id), NotFoundError);
});

test("administrators can enter and correct a record", async () => {
  const { useCases, employee } = await setup();

  const record = await useCases.addAttendance({
    employeeId: employee.id,
    timeIn: "2026-03-04T08:00:00.000Z",
    lunchOut: "2026-03-04T12:00:00.000Z",
    lunchIn: "2026-03-04T13:00:00.000Z",
    timeOut: "2026-03-04T17:00:00.000Z",
  });
  assert.equal(record.hourlyRate, 100, "defaults from salary");
  assert.equal(record.hoursWorked, 8);
  assert.equal(record.date, "2026-03-04");

  // Leaving fields out keeps them; the hours follow the corrected time.
  const fixed = await useCases.updateAttendance(record.id, { timeOut: "2026-03-04T18:00:00.000Z" });
  assert.equal(fixed.hoursWorked, 9);
  assert.equal(fixed.hourlyRate, 100);
  assert.deepEqual(fixed.lunchOut, new Date("2026-03-04T12:00:00.000Z"));

  // Sending null clears a time, which reopens the day.
  const reopened = await useCases.updateAttendance(record.id, { timeOut: null });
  assert.equal(reopened.timeOut, null);
  assert.equal(reopened.hoursWorked, null);

  await assert.rejects(
    useCases.addAttendance({ employeeId: employee.id, timeIn: "2026-03-04T09:00:00.000Z" }),
    InvalidStateError,
    "second record for the same day"
  );
  await useCases.deleteAttendance(record.id);
  await assert.rejects(useCases.getAttendance(record.id), NotFoundError);
});

test("bad records are rejected", async () => {
  const { useCases, employee } = await setup();
  const base = { employeeId: employee.id, timeIn: "2026-03-05T08:00:00.000Z" };

  await assert.rejects(useCases.addAttendance({}), ValidationError);
  await assert.rejects(useCases.addAttendance({ ...base, timeIn: "not a date" }), ValidationError);
  await assert.rejects(useCases.addAttendance({ ...base, timeOut: "2026-03-05T07:00:00.000Z" }), ValidationError);
  await assert.rejects(useCases.addAttendance({ ...base, lunchIn: "2026-03-05T13:00:00.000Z" }), ValidationError);
  await assert.rejects(
    useCases.addAttendance({ ...base, lunchOut: "2026-03-05T13:00:00.000Z", lunchIn: "2026-03-05T12:00:00.000Z" }),
    ValidationError
  );
  await assert.rejects(useCases.addAttendance({ ...base, hourlyRate: "abc" }), ValidationError);
  await assert.rejects(useCases.addAttendance({ employeeId: "nope", timeIn: base.timeIn }), NotFoundError);
});

// ---- routes ----------------------------------------------------------------------------------

let server;
let base;
let employeeId;

before(async () => {
  const { useCases, employee } = await setup();
  employeeId = employee.id;

  const app = express();
  app.use(express.json());
  app.use("/attendance", createAttendanceRouter({ attendanceUseCases: useCases, requireAuth: (req, res, next) => next() }));
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

test("clock routes and record routes", async () => {
  assert.equal((await call("POST", "/attendance/time-out", { employeeId })).status, 409);
  assert.equal((await call("POST", "/attendance/time-in", { employeeId: "nope" })).status, 404);

  const timedIn = await call("POST", "/attendance/time-in", { employeeId });
  assert.equal(timedIn.status, 200);
  assert.ok(timedIn.body._id);
  assert.equal(timedIn.body.hourlyRate, 100);
  assert.equal(timedIn.body.timeOut, null);
  assert.equal((await call("POST", "/attendance/time-in", { employeeId })).status, 409);

  assert.equal((await call("POST", "/attendance/lunch-out", { employeeId })).status, 200);
  assert.equal((await call("POST", "/attendance/lunch-in", { employeeId })).status, 200);
  const timedOut = await call("POST", "/attendance/time-out", { employeeId });
  assert.equal(timedOut.status, 200);
  assert.equal(typeof timedOut.body.hoursWorked, "number");

  const list = await call("GET", "/attendance/");
  assert.equal(list.body.count, 1);
  assert.equal((await call("GET", `/attendance/${timedIn.body._id}`)).status, 200);

  assert.equal((await call("POST", "/attendance/", {})).status, 400);
  assert.equal((await call("DELETE", `/attendance/${timedIn.body._id}`)).status, 200);
  assert.equal((await call("GET", `/attendance/${timedIn.body._id}`)).status, 404);
});
