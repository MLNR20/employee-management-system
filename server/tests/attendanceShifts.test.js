// Attendance on the workplace clock (UTC+8): the working day is the local day, and time in is checked
// against the employee's shift for lateness. Times below are written in UTC; the comment gives local time.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createAttendanceUseCases } from "../src/application/attendance/attendanceUseCases.js";
import { createShiftAssignmentUseCases } from "../src/application/shift/shiftAssignmentUseCases.js";
import { createWorkShiftUseCases } from "../src/application/shift/workShiftUseCases.js";
import { localParts, lateMinutesFor } from "../src/domain/attendance/localTime.js";
import {
  InMemoryAttendanceRepository,
  InMemoryShiftAssignmentRepository,
  InMemoryWorkShiftRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const OFFSET = 480; // UTC+8

// 2026-03-02 is a Monday, 2026-03-07 a Saturday.
const setup = async () => {
  let current = new Date("2026-03-02T00:00:00.000Z");
  const employeeRepository = createInMemoryEmployeeRepository();
  const workShiftRepository = new InMemoryWorkShiftRepository();
  const shiftAssignments = createShiftAssignmentUseCases({
    shiftAssignmentRepository: new InMemoryShiftAssignmentRepository(),
    workShiftRepository,
    employeeRepository,
    utcOffsetMinutes: OFFSET,
  });
  const shifts = createWorkShiftUseCases({ workShiftRepository });
  const attendance = createAttendanceUseCases({
    attendanceRepository: new InMemoryAttendanceRepository(),
    employeeRepository,
    shiftLookup: shiftAssignments,
    utcOffsetMinutes: OFFSET,
    now: () => current,
  });

  const employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com", salary: 17600 });
  const day = await shifts.addWorkShift({ name: "Day", startTime: "08:00", endTime: "17:00", graceMinutes: 10 });

  return {
    attendance,
    shifts,
    shiftAssignments,
    employee,
    day,
    at: (iso) => (current = new Date(iso)),
  };
};

test("local time: day, weekday and minutes follow the offset", () => {
  // 23:30 UTC on Sunday 1 March is 07:30 on Monday 2 March in UTC+8.
  assert.deepEqual(localParts("2026-03-01T23:30:00.000Z", OFFSET), { day: "2026-03-02", weekday: 1, minutes: 450 });
  assert.deepEqual(localParts("2026-03-01T23:30:00.000Z", 0), { day: "2026-03-01", weekday: 0, minutes: 1410 });
});

test("lateness: on time inside the grace period, late by the minutes after the start beyond it", () => {
  const shift = { startTime: "08:00", workDays: [1, 2, 3, 4, 5], graceMinutes: 10 };
  const late = (utc) => lateMinutesFor(shift, utc, OFFSET);

  assert.equal(late("2026-03-02T00:00:00.000Z"), 0, "08:00 on the dot");
  assert.equal(late("2026-03-02T00:10:00.000Z"), 0, "08:10 is the end of the grace period");
  assert.equal(late("2026-03-02T00:11:00.000Z"), 11, "08:11 is late, counted from 08:00");
  assert.equal(late("2026-03-01T23:30:00.000Z"), 0, "early");
  assert.equal(late("2026-03-07T01:30:00.000Z"), 0, "Saturday is not a working day for this shift");
});

test("time in records the shift and how late the employee was", async () => {
  const { attendance, shiftAssignments, employee, day, at } = await setup();
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: day.id, effectiveFrom: "2026-03-01" }, "admin");

  at("2026-03-02T00:05:00.000Z"); // 08:05 Monday
  const onTime = await attendance.timeIn(employee.id);
  assert.equal(onTime.shiftId, day.id);
  assert.equal(onTime.lateMinutes, 0);
  at("2026-03-02T09:00:00.000Z");
  await attendance.timeOut(employee.id);

  at("2026-03-03T00:25:00.000Z"); // 08:25 Tuesday
  const late = await attendance.timeIn(employee.id);
  assert.equal(late.lateMinutes, 25);
  assert.equal(late.shiftId, day.id);
});

test("the working day is the local day, so an early arrival is not filed under the day before", async () => {
  const { attendance, shiftAssignments, employee, day, at } = await setup();
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: day.id, effectiveFrom: "2026-03-01" }, "admin");

  at("2026-03-01T23:30:00.000Z"); // 07:30 Monday 2 March locally, still Sunday in UTC
  const record = await attendance.timeIn(employee.id);
  assert.equal(record.date, "2026-03-02");
  assert.equal(record.lateMinutes, 0);

  // And one record a day is judged on the local day too.
  at("2026-03-02T09:00:00.000Z");
  await attendance.timeOut(employee.id);
  at("2026-03-02T09:30:00.000Z"); // 17:30 the same local day
  await assert.rejects(attendance.timeIn(employee.id), /already timed in|already has an attendance record/);
});

test("no shift, a shift that starts later, or a day off means nobody is late", async () => {
  const { attendance, shiftAssignments, employee, day, at } = await setup();

  at("2026-03-02T03:00:00.000Z"); // 11:00, but no shift assigned
  const free = await attendance.timeIn(employee.id);
  assert.equal(free.shiftId, null);
  assert.equal(free.lateMinutes, 0);
  at("2026-03-02T09:00:00.000Z");
  await attendance.timeOut(employee.id);

  // A shift that only starts on 10 March does not apply on the 3rd.
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: day.id, effectiveFrom: "2026-03-10" }, "admin");
  at("2026-03-03T03:00:00.000Z");
  assert.equal((await attendance.timeIn(employee.id)).shiftId, null);
  at("2026-03-03T09:00:00.000Z");
  await attendance.timeOut(employee.id);

  // Saturday 14 March is outside the shift's weekdays: the shift is recorded, lateness is not.
  at("2026-03-14T03:00:00.000Z");
  const saturday = await attendance.timeIn(employee.id);
  assert.equal(saturday.shiftId, day.id);
  assert.equal(saturday.lateMinutes, 0);
});

test("a deleted shift still explains the days it was worked", async () => {
  const { attendance, shifts, shiftAssignments, employee, day, at } = await setup();
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: day.id, effectiveFrom: "2026-03-01" }, "admin");
  await shifts.deleteWorkShift(day.id);

  at("2026-03-02T00:30:00.000Z"); // 08:30
  const record = await attendance.timeIn(employee.id);
  assert.equal(record.shiftId, day.id);
  assert.equal(record.lateMinutes, 30);
});

test("shiftId and lateMinutes cannot be set by hand; a correction recalculates only when the time in moves", async () => {
  const { attendance, shifts, shiftAssignments, employee, day } = await setup();
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: day.id, effectiveFrom: "2026-03-01" }, "admin");

  const added = await attendance.addAttendance({
    employeeId: employee.id,
    timeIn: "2026-03-04T00:40:00.000Z", // 08:40 Wednesday
    lateMinutes: 0,
    shiftId: "forged",
  });
  assert.equal(added.lateMinutes, 40);
  assert.equal(added.shiftId, day.id);

  // Time out added later: lateness is untouched by hand-edited values.
  const edited = await attendance.updateAttendance(added.id, { timeOut: "2026-03-04T09:00:00.000Z", lateMinutes: 0, shiftId: null });
  assert.equal(edited.lateMinutes, 40);
  assert.equal(edited.shiftId, day.id);

  // Moving the time in recalculates it: 08:05 is inside the grace period.
  const moved = await attendance.updateAttendance(added.id, { timeIn: "2026-03-04T00:05:00.000Z" });
  assert.equal(moved.lateMinutes, 0);

  // A shift change made afterwards does not rewrite a day that was already recorded.
  const night = await shifts.addWorkShift({ name: "Night", startTime: "22:00", endTime: "06:00" });
  await shiftAssignments.assignShift({ employeeId: employee.id, shiftId: night.id, effectiveFrom: "2026-03-04" }, "admin");
  const untouched = await attendance.updateAttendance(added.id, { timeOut: "2026-03-04T10:00:00.000Z" });
  assert.equal(untouched.shiftId, day.id);
  assert.equal(untouched.lateMinutes, 0);
});
