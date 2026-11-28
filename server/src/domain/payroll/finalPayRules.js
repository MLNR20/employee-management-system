import { ValidationError } from "../errors.js";
import { isMissing } from "../pickFields.js";
import { WORKING_HOURS_PER_DAY, hourlyRateFromSalary } from "../attendance/attendanceRules.js";
import { applyDeductions } from "./deductionRules.js";
import { rateInForce, round2 } from "./payrollRules.js";

// What a leaving employee is still owed:
//   unpaid salary      attendance from `from` to the last working day
//   13th month pay     one twelfth of the salary earned in the year of the last working day
//   leave conversion   unused paid leave days at the daily rate (hourly rate x 8)
// less the payroll deductions on the unpaid salary, plus or minus whatever HR adds by hand.

export const MAX_ADJUSTMENTS = 20;

const isRealDay = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** The start of the cut-off (1st to 15th, 16th to month end) that holds `day`. */
export const cutOffStart = (day) => `${day.slice(0, 8)}${Number(day.slice(8)) >= 16 ? "16" : "01"}`;

/** Checks what HR sent for a final pay computation and returns it with the defaults filled in. */
export function readFinalPayInput({ from, leaveDays, adjustments = [] } = {}, lastWorkingDay) {
  const start = isMissing(from) ? cutOffStart(lastWorkingDay) : from;
  if (!isRealDay(start)) throw new ValidationError("from must be a valid day (YYYY-MM-DD)");
  if (start > lastWorkingDay) throw new ValidationError("from cannot be after the last working day");
  if (start < `${Number(lastWorkingDay.slice(0, 4)) - 1}-01-01`) {
    throw new ValidationError("from cannot be more than a year before the last working day");
  }

  let days = null;
  if (!isMissing(leaveDays)) {
    days = Number(leaveDays);
    if (!Number.isFinite(days) || days < 0 || days > 365) throw new ValidationError("leaveDays must be from 0 to 365");
  }

  if (!Array.isArray(adjustments) || adjustments.length > MAX_ADJUSTMENTS) {
    throw new ValidationError(`Send at most ${MAX_ADJUSTMENTS} adjustments`);
  }
  const lines = adjustments.map((line) => {
    const label = typeof line?.label === "string" ? line.label.trim() : "";
    const amount = isMissing(line?.amount) ? NaN : Number(line.amount);
    if (!label || label.length > 100 || !Number.isFinite(amount) || amount === 0) {
      throw new ValidationError("Each adjustment needs a label and an amount that is not zero");
    }
    return { label, amount: round2(amount) };
  });

  return { from: start, leaveDays: days, adjustments: lines };
}

const payOf = (record) => round2((record.hoursWorked ?? 0) * (record.hourlyRate ?? 0));
const sum = (values) => round2(values.reduce((total, value) => total + value, 0));

/**
 * @param {Object} input
 * @param {object} input.employee
 * @param {Array} input.attendance the employee's records covering the year and the unpaid days
 * @param {Array} input.rates the employee's assigned hourly rates
 * @param {Array} input.deductionRules
 * @param {Array<{name: string, availableDays: number}>} input.paidLeave unused days of each paid leave type
 * @param {string} input.lastWorkingDay
 * @param {{from: string, leaveDays: number | null, adjustments: Array}} input.options see readFinalPayInput
 */
export function buildFinalPay({ employee, attendance, rates, deductionRules, paidLeave, lastWorkingDay, options }) {
  const { from, adjustments } = options;
  const yearStart = `${lastWorkingDay.slice(0, 4)}-01-01`;
  const between = (start) => attendance.filter((record) => record.date >= start && record.date <= lastWorkingDay);

  const unpaidDays = between(from);
  const unpaidSalary = sum(unpaidDays.map(payOf));
  const earnedThisYear = sum(between(yearStart).map(payOf));
  const thirteenthMonth = round2(earnedThisYear / 12);

  const hourlyRate = rateInForce(rates, lastWorkingDay) ?? hourlyRateFromSalary(employee.salary);
  const dailyRate = hourlyRate === null ? null : round2(hourlyRate * WORKING_HOURS_PER_DAY);
  const recordedLeaveDays = sum(paidLeave.map((leave) => leave.availableDays));
  const leaveDays = options.leaveDays ?? recordedLeaveDays;
  const leaveConversion = round2(leaveDays * (dailyRate ?? 0));

  const { deductions, totalDeductions } = applyDeductions(unpaidSalary, deductionRules);
  const added = sum(adjustments.filter((a) => a.amount > 0).map((a) => a.amount));
  const subtracted = sum(adjustments.filter((a) => a.amount < 0).map((a) => -a.amount));

  const totalEarnings = sum([unpaidSalary, thirteenthMonth, leaveConversion, added]);
  const allDeductions = sum([totalDeductions, subtracted]);

  return {
    employeeId: employee.id,
    employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
    from,
    lastWorkingDay,
    unpaidSalary,
    daysWorked: unpaidDays.filter((record) => record.hoursWorked !== null).length,
    earnedThisYear,
    thirteenthMonth,
    dailyRate,
    paidLeave,
    recordedLeaveDays,
    leaveDays,
    leaveConversion,
    deductions,
    adjustments,
    totalEarnings,
    totalDeductions: allDeductions,
    // Negative means the employee owes the company.
    netPay: round2(totalEarnings - allDeductions),
  };
}
