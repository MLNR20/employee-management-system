import { ValidationError } from "../errors.js";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** The longest period a report may cover, so one request cannot sweep the whole history. */
export const MAX_PERIOD_DAYS = 93;

export const round2 = (number) => Math.round(number * 100) / 100;

const isRealDay = (value) => DAY.test(value) && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;

/** Throws ValidationError unless `from` and `to` are real "YYYY-MM-DD" days, in order, within MAX_PERIOD_DAYS. */
export function assertValidPeriod({ from, to } = {}) {
  if (!isRealDay(String(from ?? "")) || !isRealDay(String(to ?? ""))) {
    throw new ValidationError("from and to must be valid days (YYYY-MM-DD)");
  }
  if (to < from) throw new ValidationError("to cannot be before from");

  const days = (new Date(`${to}T00:00:00.000Z`) - new Date(`${from}T00:00:00.000Z`)) / MS_PER_DAY + 1;
  if (days > MAX_PERIOD_DAYS) throw new ValidationError(`A payroll period cannot be longer than ${MAX_PERIOD_DAYS} days`);
}

/** The hourly rate in force on `day`: the latest assignment starting on or before it, or null. */
export function rateInForce(rates, day) {
  const latest = rates
    .filter((rate) => rate.effectiveFrom <= day)
    .reduce((best, rate) => (!best || rate.effectiveFrom >= best.effectiveFrom ? rate : best), null);
  return latest ? latest.hourlyRate : null;
}

/**
 * One payroll line per employee for the days from `from` to `to`.
 *
 * Pay is worked out day by day from the rate copied onto each attendance record at time in, so a raise
 * partway through the period pays each day at the rate it was earned at. A day that is still timed in
 * (no hours yet) earns nothing until the employee times out. `hourlyRate` is the rate in force on the
 * last day of the period, which is what HR is looking at when they open the report.
 *
 * Active employees always appear (with zeros when they did not work); an inactive one appears only
 * if they have records in the period.
 *
 * @param {{employees: Array, attendance: Array, rates: Array, from: string, to: string}} input
 */
export function buildPayroll({ employees, attendance, rates, from, to }) {
  const recordsBy = new Map();
  for (const record of attendance) {
    if (record.date < from || record.date > to) continue;
    if (!recordsBy.has(record.employeeId)) recordsBy.set(record.employeeId, []);
    recordsBy.get(record.employeeId).push(record);
  }

  const ratesBy = new Map();
  for (const rate of rates) {
    if (!ratesBy.has(rate.employeeId)) ratesBy.set(rate.employeeId, []);
    ratesBy.get(rate.employeeId).push(rate);
  }

  const rows = employees
    .filter((employee) => employee.isActive !== false || recordsBy.has(employee.id))
    .map((employee) => {
      const records = [...(recordsBy.get(employee.id) ?? [])].sort((a, b) => a.date.localeCompare(b.date));
      const days = records.map((record) => ({
        date: record.date,
        timeIn: record.timeIn,
        timeOut: record.timeOut,
        hoursWorked: record.hoursWorked,
        hourlyRate: record.hourlyRate,
        lateMinutes: record.lateMinutes ?? 0,
        pay: round2((record.hoursWorked ?? 0) * (record.hourlyRate ?? 0)),
      }));

      return {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`.trim(),
        email: employee.email,
        position: employee.position,
        department: employee.department,
        hourlyRate: rateInForce(ratesBy.get(employee.id) ?? [], to),
        daysWorked: days.filter((day) => day.hoursWorked !== null).length,
        hoursWorked: round2(days.reduce((sum, day) => sum + (day.hoursWorked ?? 0), 0)),
        lateMinutes: days.reduce((sum, day) => sum + day.lateMinutes, 0),
        grossPay: round2(days.reduce((sum, day) => sum + day.pay, 0)),
        days,
      };
    })
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));

  return {
    from,
    to,
    totals: {
      employees: rows.length,
      hoursWorked: round2(rows.reduce((sum, row) => sum + row.hoursWorked, 0)),
      grossPay: round2(rows.reduce((sum, row) => sum + row.grossPay, 0)),
    },
    data: rows,
  };
}
