// Payroll deductions set up by HR, net pay, and the final pay of a leaving employee.
import { test } from "node:test";
import assert from "node:assert/strict";
import { applyDeductions, deductionAmount, parseBrackets } from "../src/domain/payroll/deductionRules.js";
import { cutOffStart, readFinalPayInput } from "../src/domain/payroll/finalPayRules.js";
import { createPayrollDeductionUseCases } from "../src/application/payroll/deductionUseCases.js";
import { createPayrollUseCases } from "../src/application/payroll/payrollUseCases.js";
import { PayrollDeduction } from "../src/domain/payroll/PayrollDeduction.js";
import {
  InMemoryAttendanceRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
  createInMemoryLeaveTypeRepository,
} from "./fakes.js";

const deductionStore = () =>
  new InMemoryRepository((props) => new PayrollDeduction(props), [["name"]], () => new Error("duplicate name"));

// A made-up table: the first 1,000 is free, then 10%, then 100 plus 20% above 2,000.
const TABLE = "2000, 100, 20\n0, 0, 0\n1000, 0, 10";

test("brackets are read from text, sorted, and checked", () => {
  assert.deepEqual(parseBrackets(TABLE).map((b) => b.from), [0, 1000, 2000]);
  assert.deepEqual(parseBrackets(""), []);
  assert.throws(() => parseBrackets("100, 5"), /from, base, percent/);
  assert.throws(() => parseBrackets("0,0,101"), /percent/);
  assert.throws(() => parseBrackets("0,0,1\n0,0,2"), /same amount/);
  assert.throws(() => parseBrackets("a,0,1"), /from/);
});

test("each method works out its amount", () => {
  const brackets = parseBrackets(TABLE);
  const table = (pay) => deductionAmount({ method: "brackets", brackets }, pay);
  assert.deepEqual([table(500), table(1000), table(1500), table(3000)], [0, 0, 50, 300]);

  const percent = { method: "percent", percent: 5, minAmount: 100, maxAmount: 500 };
  assert.deepEqual([1000, 4000, 20000].map((pay) => deductionAmount(percent, pay)), [100, 200, 500]);
  assert.equal(deductionAmount({ method: "percent", percent: 2.5, minAmount: null, maxAmount: null }, 1001), 25.03);
  assert.equal(deductionAmount({ method: "fixed", amount: 150 }, 10), 150);
  assert.equal(deductionAmount(percent, 0), 0, "nothing from no pay");
});

test("gross deductions come first, the rest see what is left, and pay never goes below zero", () => {
  const rules = [
    { name: "Tax", method: "percent", percent: 10, base: "after_deductions" },
    { name: "Insurance", method: "percent", percent: 10, base: "gross" },
    { name: "Dues", method: "fixed", amount: 100, base: "gross" },
    { name: "Off", method: "fixed", amount: 999, base: "gross", isActive: false },
  ];
  assert.deepEqual(applyDeductions(2000, rules), {
    deductions: [
      { name: "Insurance", amount: 200 },
      { name: "Dues", amount: 100 },
      { name: "Tax", amount: 170 },
    ],
    totalDeductions: 470,
    netPay: 1530,
  });
  assert.deepEqual(applyDeductions(50, rules), {
    deductions: [
      { name: "Insurance", amount: 5 },
      { name: "Dues", amount: 45 },
    ],
    totalDeductions: 50,
    netPay: 0,
  });
  assert.deepEqual(applyDeductions(0, rules), { deductions: [], totalDeductions: 0, netPay: 0 });
});

test("a deduction is validated and keeps only what its method uses", async () => {
  const useCases = createPayrollDeductionUseCases({ payrollDeductionRepository: deductionStore() });
  const add = (input) => useCases.addDeduction(input);

  await assert.rejects(add({}), /name, method/);
  await assert.rejects(add({ name: "X", method: "magic" }), /method must be/);
  await assert.rejects(add({ name: "X", method: "fixed" }), /amount/);
  await assert.rejects(add({ name: "X", method: "fixed", amount: -1 }), /amount/);
  await assert.rejects(add({ name: "X", method: "percent", percent: 120 }), /percent/);
  await assert.rejects(add({ name: "X", method: "percent", percent: 5, minAmount: 10, maxAmount: 5 }), /maxAmount/);
  await assert.rejects(add({ name: "X", method: "brackets", brackets: "" }), /at least one bracket/);
  await assert.rejects(add({ name: "X", method: "fixed", amount: 1, base: "net" }), /base must be/);

  const saved = await add({ name: " Health ", method: "percent", percent: "5", amount: "900", brackets: TABLE, base: "" });
  assert.equal(saved.name, "Health");
  assert.equal(saved.base, "gross");
  assert.equal(saved.percent, 5);
  assert.equal(saved.amount, null);
  assert.deepEqual(saved.brackets, []);
});

const payrollSetup = async ({ separation } = {}) => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const attendanceRepository = new InMemoryAttendanceRepository();
  const salaryRateRepository = new InMemorySalaryRateRepository();
  const payrollDeductionRepository = deductionStore();
  const leaveBalanceRepository = new InMemoryLeaveBalanceRepository();
  const leaveTypeRepository = createInMemoryLeaveTypeRepository();
  const employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "a@x.com", salary: 17600, separation });
  const day = (date, hours = 8, rate = 100) =>
    attendanceRepository.create({ employeeId: employee.id, date, timeIn: new Date(date), hoursWorked: hours, hourlyRate: rate });

  await day("2025-12-30"); // last year: not in this year's 13th month
  await day("2026-01-05");
  await day("2026-03-02");
  await day("2026-03-16");
  await day("2026-03-17", 4);
  await day("2026-03-25"); // after the last working day
  await salaryRateRepository.create({ employeeId: employee.id, hourlyRate: 100, effectiveFrom: "2025-01-01" });
  await payrollDeductionRepository.create({ name: "Insurance", method: "percent", percent: 10, base: "gross" });

  const vacation = await leaveTypeRepository.create({ name: "Vacation", isPaid: true });
  const unpaid = await leaveTypeRepository.create({ name: "Unpaid", isPaid: false });
  await leaveBalanceRepository.create({ employeeId: employee.id, leaveTypeId: vacation.id, maxLeaves: 10, availableLeaves: 3 });
  await leaveBalanceRepository.create({ employeeId: employee.id, leaveTypeId: unpaid.id, maxLeaves: 10, availableLeaves: 10 });

  const payroll = createPayrollUseCases({
    employeeRepository,
    attendanceRepository,
    salaryRateRepository,
    payrollDeductionRepository,
    leaveBalanceRepository,
    leaveTypeRepository,
  });
  return { payroll, employee };
};

test("the payroll report shows deductions and net pay", async () => {
  const { payroll } = await payrollSetup();
  const report = await payroll.report({ from: "2026-03-16", to: "2026-03-31" });

  const [row] = report.data;
  assert.equal(row.grossPay, 2000);
  assert.deepEqual(row.deductions, [{ name: "Insurance", amount: 200 }]);
  assert.equal(row.netPay, 1800);
  assert.equal(report.totals.totalDeductions, 200);
  assert.equal(report.totals.netPay, 1800);
});

const separation = { status: "in_progress", separationType: "resignation", lastWorkingDay: "2026-03-20" };

test("final pay adds unpaid salary, 13th month and unused paid leave, less deductions", async () => {
  const { payroll, employee } = await payrollSetup({ separation });
  const result = await payroll.finalPay(employee.id);

  assert.equal(result.from, "2026-03-16", "the cut-off holding the last working day");
  assert.equal(result.unpaidSalary, 1200); // 8h + 4h at 100
  assert.equal(result.earnedThisYear, 2800); // Jan 5, Mar 2, 16 and 17
  assert.equal(result.thirteenthMonth, 233.33);
  assert.equal(result.dailyRate, 800);
  assert.deepEqual(result.paidLeave, [{ name: "Vacation", availableDays: 3 }]);
  assert.equal(result.leaveConversion, 2400);
  assert.deepEqual(result.deductions, [{ name: "Insurance", amount: 120 }]);
  assert.equal(result.totalEarnings, 3833.33);
  assert.equal(result.netPay, 3713.33);
});

test("HR can move the unpaid start, change the leave days and add lines", async () => {
  const { payroll, employee } = await payrollSetup({ separation });
  const result = await payroll.finalPay(employee.id, {
    from: "2025-12-16",
    leaveDays: 0,
    adjustments: [
      { label: " Bonus ", amount: "500" },
      { label: "Unreturned laptop", amount: -10000 },
    ],
  });

  assert.equal(result.unpaidSalary, 3600, "five worked records, the one after leaving excluded");
  assert.equal(result.thirteenthMonth, 233.33, "still only this year's earnings");
  assert.equal(result.leaveConversion, 0);
  assert.equal(result.recordedLeaveDays, 3);
  assert.equal(result.totalEarnings, 4333.33);
  assert.equal(result.totalDeductions, 10360);
  assert.equal(result.netPay, -6026.67, "a negative result is owed to the company");
});

test("final pay needs an offboarding and sensible input", async () => {
  const none = await payrollSetup();
  await assert.rejects(none.payroll.finalPay(none.employee.id), /offboarding/);
  await assert.rejects(none.payroll.finalPay("000000000000000000000fff"), /not found/);

  const read = (input) => () => readFinalPayInput(input, "2026-03-20");
  assert.throws(read({ from: "2026-03-21" }), /after the last working day/);
  assert.throws(read({ from: "2024-12-31" }), /more than a year/);
  assert.throws(read({ from: "2026-02-30" }), /valid day/);
  assert.throws(read({ leaveDays: -1 }), /leaveDays/);
  assert.throws(read({ adjustments: [{ label: "", amount: 1 }] }), /label/);
  assert.throws(read({ adjustments: [{ label: "x", amount: 0 }] }), /not zero/);
  assert.throws(read({ adjustments: "x" }), /at most/);
  assert.equal(cutOffStart("2026-03-15"), "2026-03-01");
  assert.equal(cutOffStart("2026-03-31"), "2026-03-16");
});
