import { test } from "node:test";
import assert from "node:assert/strict";
import { buildAttendance, absentOn } from "../src/domain/dashboard/attendance.js";
import { createDashboardUseCases } from "../src/application/dashboard/dashboardUseCases.js";
import { createInMemoryEmployeeRepository, InMemoryLeaveRequestRepository } from "./fakes.js";

// 2025-10-15 is a Wednesday.
const leave = (employeeId, startDate, endDate) => ({ employeeId, startDate: new Date(startDate), endDate: new Date(endDate) });

test("absentOn counts each employee once, and only on the days their leave covers", () => {
  const leaves = [leave("a", "2025-10-14", "2025-10-16"), leave("a", "2025-10-15", "2025-10-15"), leave("b", "2025-10-15", "2025-10-17")];
  assert.equal(absentOn("2025-10-13", leaves).size, 0);
  assert.equal(absentOn("2025-10-14", leaves).size, 1);
  assert.equal(absentOn("2025-10-15", leaves).size, 2); // a twice still counts once
  assert.equal(absentOn("2025-10-17", leaves).size, 1);
});

test("buildAttendance gives one point per working day, oldest first, and skips weekends", () => {
  // Mon 13th .. Mon 20th, ending on Mon 20th: 8 calendar days, 6 working days
  const series = buildAttendance({
    today: "2025-10-20",
    days: 8,
    activeCount: 10,
    leaves: [leave("a", "2025-10-15", "2025-10-16"), leave("b", "2025-10-16", "2025-10-16")],
  });
  assert.deepEqual(series.map((p) => p.date), ["2025-10-13", "2025-10-14", "2025-10-15", "2025-10-16", "2025-10-17", "2025-10-20"]);
  assert.deepEqual(series.map((p) => p.absent), [0, 0, 1, 2, 0, 0]);
  assert.deepEqual(series.map((p) => p.present), [10, 10, 9, 8, 10, 10]);
});

test("present never goes below zero", () => {
  const series = buildAttendance({ today: "2025-10-15", days: 1, activeCount: 1, leaves: [leave("a", "2025-10-15", "2025-10-15"), leave("b", "2025-10-15", "2025-10-15")] });
  assert.equal(series[0].present, 0);
});

const setup = async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const leaveRequestRepository = new InMemoryLeaveRequestRepository();
  const base = { position: "Dev", department: "IT", salary: 1 };
  const ids = [];
  for (const [i, isActive] of [[1, true], [2, true], [3, true], [4, false]]) {
    ids.push((await employeeRepository.create({ ...base, first_name: `E${i}`, last_name: "X", email: `e${i}@x.com`, isActive })).id);
  }
  const file = (employeeId, startDate, endDate, status) =>
    leaveRequestRepository.create({ employeeId, leaveTypeId: "t", startDate: new Date(startDate), endDate: new Date(endDate), days: 1, status });
  await file(ids[0], "2025-10-15", "2025-10-15", "approved");
  await file(ids[1], "2025-10-15", "2025-10-16", "pending"); // not approved: does not count
  await file(ids[2], "2025-10-10", "2025-10-10", "approved"); // earlier day
  const useCases = createDashboardUseCases({ employeeRepository, leaveRequestRepository, now: () => new Date("2025-10-15T09:30:00Z") });
  return { useCases, ids };
};

test("summary counts present and absent today from approved leave only", async () => {
  const { useCases } = await setup();
  assert.deepEqual(await useCases.summary(), { date: "2025-10-15", total: 4, active: 3, inactive: 1, present: 2, absent: 1 });
});

test("attendance covers the requested window, defaults to 14 days and caps at 90", async () => {
  const { useCases } = await setup();
  const week = await useCases.attendance({ days: "7" }); // 9th..15th: 5 working days
  assert.equal(week.length, 5);
  assert.deepEqual(week.at(-1), { date: "2025-10-15", present: 2, absent: 1 });
  assert.equal(week.find((p) => p.date === "2025-10-10").absent, 1);

  assert.equal((await useCases.attendance({})).length, 10); // 14 calendar days = 10 working days
  assert.equal((await useCases.attendance({ days: "abc" })).length, 10);
  assert.ok((await useCases.attendance({ days: "9999" })).length <= 65);
});
