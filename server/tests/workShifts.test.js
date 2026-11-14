// Work shifts: CRUD over HTTP, uniqueness, soft delete, and who works which shift from when.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createWorkShiftUseCases } from "../src/application/shift/workShiftUseCases.js";
import { createShiftAssignmentUseCases } from "../src/application/shift/shiftAssignmentUseCases.js";
import { createWorkShiftRouter, createShiftAssignmentRouter } from "../src/presentation/http/routes/shiftRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  InMemoryShiftAssignmentRepository,
  InMemoryWorkShiftRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const ADMIN = "000000000000000000000b01";
let server;
let base;
let workShiftRepository;
let shiftAssignments;
let employee;

before(async () => {
  workShiftRepository = new InMemoryWorkShiftRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com" });

  shiftAssignments = createShiftAssignmentUseCases({
    shiftAssignmentRepository: new InMemoryShiftAssignmentRepository(),
    workShiftRepository,
    employeeRepository,
    utcOffsetMinutes: 480,
    now: () => new Date("2026-03-02T20:00:00.000Z"), // 04:00 on 3 March in UTC+8
  });

  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    req.user = { id: ADMIN };
    next();
  };
  app.use("/work-shifts", createWorkShiftRouter({ workShiftUseCases: createWorkShiftUseCases({ workShiftRepository }), requireAuth }));
  app.use("/shift-assignments", createShiftAssignmentRouter({ shiftAssignmentUseCases: shiftAssignments, requireAuth }));
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

const day = { name: "Day Shift", startTime: "08:00", endTime: "17:00", lunchMinutes: 60, graceMinutes: 10 };

test("create, read, list and update a shift", async () => {
  const created = await call("POST", "/work-shifts/", day);
  assert.equal(created.status, 200);
  assert.equal(created.body.name, "Day Shift");
  assert.deepEqual(created.body.workDays, [1, 2, 3, 4, 5], "Monday to Friday by default");
  assert.equal(created.body.deletedAt, null);

  const id = created.body._id;
  assert.equal((await call("GET", `/work-shifts/${id}`)).body.startTime, "08:00");
  assert.equal((await call("GET", "/work-shifts/")).body.count, 1);

  // A partial update keeps everything else; weekdays are stored sorted.
  const update = await call("PUT", `/work-shifts/${id}`, { graceMinutes: 15, workDays: [6, 1, 3] });
  assert.equal(update.status, 200);
  const stored = (await call("GET", `/work-shifts/${id}`)).body;
  assert.equal(stored.graceMinutes, 15);
  assert.deepEqual(stored.workDays, [1, 3, 6]);
  assert.equal(stored.name, "Day Shift");
  assert.equal(stored.endTime, "17:00");

  assert.equal((await call("GET", "/work-shifts/nope")).status, 404);
  assert.equal((await call("PUT", "/work-shifts/nope", { name: "x" })).status, 404);

  await call("DELETE", `/work-shifts/${id}`);
});

test("bad shifts are rejected", async () => {
  const post = (changes) => call("POST", "/work-shifts/", { ...day, name: "Bad", ...changes });

  assert.equal((await call("POST", "/work-shifts/", {})).status, 400);
  assert.equal((await post({ name: "  " })).status, 400);
  assert.equal((await post({ startTime: "8am" })).status, 400);
  assert.equal((await post({ startTime: "25:00" })).status, 400);
  assert.equal((await post({ endTime: "08:00" })).status, 400, "start and end the same");
  assert.equal((await post({ lunchMinutes: -5 })).status, 400);
  assert.equal((await post({ lunchMinutes: 999 })).status, 400);
  assert.equal((await post({ lunchMinutes: 30.5 })).status, 400);
  assert.equal((await post({ graceMinutes: 500 })).status, 400);
  assert.equal((await post({ workDays: [] })).status, 400);
  assert.equal((await post({ workDays: [1, 1] })).status, 400);
  assert.equal((await post({ workDays: [7] })).status, 400);
  assert.equal((await post({ workDays: "1,2" })).status, 400);

  // An overnight shift (end earlier than start) is fine.
  const night = await post({ name: "Night", startTime: "22:00", endTime: "06:00" });
  assert.equal(night.status, 200);
  await call("DELETE", `/work-shifts/${night.body._id}`);
});

test("every shift is unique by name and by schedule", async () => {
  const first = await call("POST", "/work-shifts/", day);
  assert.equal(first.status, 200);

  // Same name, whatever the case or spacing, even with different hours.
  assert.equal((await call("POST", "/work-shifts/", { ...day, name: "day shift", startTime: "09:00", endTime: "18:00" })).status, 409);
  assert.equal((await call("POST", "/work-shifts/", { ...day, name: "  DAY SHIFT ", startTime: "09:00", endTime: "18:00" })).status, 409);

  // Same hours, lunch and weekdays under another name. The grace period does not make it different.
  const sameHours = await call("POST", "/work-shifts/", { ...day, name: "Office Hours", graceMinutes: 0 });
  assert.equal(sameHours.status, 409);
  assert.match(sameHours.body.message, /Day Shift/);

  // A different weekday set, lunch or hours is a different shift.
  const weekend = await call("POST", "/work-shifts/", { ...day, name: "Weekend", workDays: [0, 6] });
  assert.equal(weekend.status, 200);
  const shortLunch = await call("POST", "/work-shifts/", { ...day, name: "Short Lunch", lunchMinutes: 30 });
  assert.equal(shortLunch.status, 200);

  // Updating cannot collide with another shift, but keeping your own name and hours is fine.
  assert.equal((await call("PUT", `/work-shifts/${weekend.body._id}`, { name: "Day Shift" })).status, 409);
  assert.equal((await call("PUT", `/work-shifts/${weekend.body._id}`, { workDays: [1, 2, 3, 4, 5] })).status, 409);
  assert.equal((await call("PUT", `/work-shifts/${weekend.body._id}`, { name: "Weekend" })).status, 200);
  assert.equal((await call("PUT", `/work-shifts/${first.body._id}`, { name: "Day Shift", graceMinutes: 20 })).status, 200);

  for (const shift of [first, weekend, shortLunch]) await call("DELETE", `/work-shifts/${shift.body._id}`);
});

test("deleting is a soft delete that frees the name and schedule", async () => {
  const created = await call("POST", "/work-shifts/", day);
  const id = created.body._id;

  assert.equal((await call("DELETE", `/work-shifts/${id}`)).status, 200);

  // Gone from every read and write...
  assert.equal((await call("GET", `/work-shifts/${id}`)).status, 404);
  assert.equal((await call("GET", "/work-shifts/")).body.count, 0);
  assert.equal((await call("GET", "/work-shifts/?page=1")).body.count, 0);
  assert.equal((await call("PUT", `/work-shifts/${id}`, { name: "Revived" })).status, 404);
  assert.equal((await call("DELETE", `/work-shifts/${id}`)).status, 404, "already deleted");

  // ...but the row is still there, marked deleted and inactive.
  const kept = await workShiftRepository.findByIdIncludingDeleted(id);
  assert.ok(kept.deletedAt instanceof Date);
  assert.equal(kept.isActive, false);

  // Its name and hours can be used again by a new shift.
  const again = await call("POST", "/work-shifts/", day);
  assert.equal(again.status, 200);
  assert.notEqual(again.body._id, id);
  await call("DELETE", `/work-shifts/${again.body._id}`);
});

test("shift assignments are dated, recorded against the signed-in administrator, and keep history", async () => {
  const dayShift = (await call("POST", "/work-shifts/", day)).body;
  const night = (await call("POST", "/work-shifts/", { name: "Night", startTime: "22:00", endTime: "06:00" })).body;

  const first = await call("POST", "/shift-assignments/", { employeeId: employee.id, shiftId: dayShift._id, assignedBy: "forged" });
  assert.equal(first.status, 200);
  assert.equal(first.body.assignedBy, ADMIN, "taken from the sign-in, not the body");
  assert.equal(first.body.effectiveFrom, "2026-03-03", "defaults to today on the workplace clock (UTC+8), not UTC");

  const later = await call("POST", "/shift-assignments/", { employeeId: employee.id, shiftId: night._id, effectiveFrom: "2026-04-01" });
  assert.equal(later.status, 200);

  const history = await call("GET", `/shift-assignments/employee/${employee.id}`);
  assert.deepEqual(history.body.data.map((a) => a.effectiveFrom), ["2026-04-01", "2026-03-03"]);

  // The shift on a day is the latest assignment started on or before it.
  assert.equal(await shiftAssignments.effectiveShift(employee.id, "2026-03-02"), null);
  assert.equal((await shiftAssignments.effectiveShift(employee.id, "2026-03-31")).name, "Day Shift");
  assert.equal((await shiftAssignments.effectiveShift(employee.id, "2026-04-01")).name, "Night");

  // Bad input.
  const post = (body) => call("POST", "/shift-assignments/", body);
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ employeeId: employee.id, shiftId: dayShift._id, effectiveFrom: "soon" })).status, 400);
  assert.equal((await post({ employeeId: "nope", shiftId: dayShift._id })).status, 404);
  assert.equal((await post({ employeeId: employee.id, shiftId: "nope" })).status, 400);

  // Never edited; a mistaken one can be removed.
  assert.equal((await call("PUT", `/shift-assignments/${first.body._id}`, {})).status, 404);
  assert.equal((await call("DELETE", `/shift-assignments/${later.body._id}`)).status, 200);
  assert.equal((await call("GET", `/shift-assignments/${later.body._id}`)).status, 404);

  // A deleted shift cannot be given to anyone new, but how past days were scheduled is kept.
  await call("DELETE", `/work-shifts/${dayShift._id}`);
  assert.equal((await post({ employeeId: employee.id, shiftId: dayShift._id })).status, 400);
  assert.equal((await shiftAssignments.effectiveShift(employee.id, "2026-03-31")).name, "Day Shift");
  assert.ok((await shiftAssignments.effectiveShift(employee.id, "2026-03-31")).deletedAt);
});
