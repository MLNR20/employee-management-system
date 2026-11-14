// The resource configs only reference the data hooks; stubbing them keeps axios (an ES module Jest
// cannot load here) out of these tests.
jest.mock(
  "../../hooks/useEntities",
  () =>
    new Proxy(
      { __esModule: true },
      { get: (target, name) => (name in target || typeof name === "symbol" || name === "then" ? target[name] : () => undefined) }
    )
);

import { Attendance, fromLocalInput, toLocalInput } from "./Attendance";
import { SalaryRate } from "../salary/SalaryRate";
import { attendanceResource } from "../../resources/attendance";
import { salaryRateResource } from "../../resources/salaryRates";

test("a time survives the trip between the form and the server", () => {
  const local = "2026-03-02T08:30";
  const sent = fromLocalInput(local);
  expect(new Date(sent).toISOString()).toBe(sent); // a real instant, not local text
  expect(toLocalInput(sent)).toBe(local);
  expect(fromLocalInput("")).toBe("");
  expect(toLocalInput(null)).toBeUndefined();
  expect(toLocalInput("not a date")).toBeUndefined();
});

test("pay needs both the hours and the rate, so it is blank when the rate is hidden", () => {
  expect(new Attendance({ hoursWorked: 8, hourlyRate: 100.5 }).pay).toBe(804);
  expect(new Attendance({ hoursWorked: 8 }).pay).toBeUndefined();
  expect(new Attendance({ hourlyRate: 100 }).pay).toBeUndefined();
});

test("the rate is read from the API only when the server sent it", () => {
  const withRate = Attendance.fromApi({ _id: "1", hoursWorked: 8, hourlyRate: 100 });
  const withoutRate = Attendance.fromApi({ _id: "2", hoursWorked: 8 });
  expect(withRate.hourlyRate).toBe(100);
  expect(withoutRate.hourlyRate).toBeUndefined();
});

test("attendance shows rate and pay columns to HR only", () => {
  const keys = (canSeeRates) => attendanceResource.columns({ employees: [], canSeeRates }).map((c) => c.key);
  expect(keys(true)).toEqual(expect.arrayContaining(["hourlyRate", "pay"]));
  expect(keys(false)).not.toContain("hourlyRate");
  expect(keys(false)).not.toContain("pay");
  expect(attendanceResource.fields.map((f) => f.name)).not.toContain("hourlyRate");
});

test("salary rates are gated by a permission and can only be assigned, never edited or deleted", () => {
  expect(salaryRateResource.permission).toBe("salary-rates:view");
  expect(salaryRateResource.hooks.useCreate).toBeDefined();
  expect(salaryRateResource.hooks.useUpdate).toBeUndefined();
  expect(salaryRateResource.hooks.useRemove).toBeUndefined();
  expect(attendanceResource.permission).toBeUndefined();
});

test("a salary rate keeps its start date as a calendar day", () => {
  const rate = SalaryRate.fromApi({ _id: "r1", employeeId: "e1", hourlyRate: 125.5, effectiveFrom: "2026-04-01T00:00:00.000Z" });
  expect(rate.effectiveFrom).toBe("2026-04-01");
});
