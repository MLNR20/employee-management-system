import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { toDay } from "../dashboard/attendance.js";

const TIME_FIELDS = ["timeIn", "lunchOut", "lunchIn", "timeOut"];
const ALLOWED = ["employeeId", ...TIME_FIELDS, "hourlyRate", "isActive"];

const MS_PER_HOUR = 60 * 60 * 1000;

// The employee record holds a monthly salary, not an hourly rate. When no rate is given at time in,
// the rate is worked out from the salary: 22 working days a month, 8 hours a day.
export const WORKING_DAYS_PER_MONTH = 22;
export const WORKING_HOURS_PER_DAY = 8;

const round2 = (number) => Math.round(number * 100) / 100;

const toTime = (value) => (isMissing(value) ? null : new Date(value));

/** Monthly salary to an hourly rate, rounded to cents. Null when the salary is not a usable number. */
export function hourlyRateFromSalary(salary) {
  const monthly = Number(salary);
  if (isMissing(salary) || Number.isNaN(monthly) || monthly < 0) return null;
  return round2(monthly / WORKING_DAYS_PER_MONTH / WORKING_HOURS_PER_DAY);
}

/** Hours between time in and time out, less the lunch break. Null while still timed in. */
export function computeHoursWorked({ timeIn, lunchOut, lunchIn, timeOut }) {
  if (isMissing(timeIn) || isMissing(timeOut)) return null;

  let ms = new Date(timeOut) - new Date(timeIn);
  if (!isMissing(lunchOut) && !isMissing(lunchIn)) ms -= new Date(lunchIn) - new Date(lunchOut);

  return round2(ms / MS_PER_HOUR);
}

/**
 * Throws ValidationError unless the record is sensible: an employee and a time in, real dates, a
 * rate of 0 or more, lunch in only after lunch out, and every time no earlier than the one before.
 */
export function assertValidAttendance(input) {
  if (isMissing(input.employeeId) || isMissing(input.timeIn)) {
    throw new ValidationError("Send all required fields: employeeId, timeIn");
  }

  for (const field of TIME_FIELDS) {
    if (!isMissing(input[field]) && Number.isNaN(new Date(input[field]).getTime())) {
      throw new ValidationError(`${field} must be a valid date and time`);
    }
  }

  if (!isMissing(input.hourlyRate)) {
    const rate = Number(input.hourlyRate);
    if (Number.isNaN(rate) || rate < 0) throw new ValidationError("hourlyRate must be a number, 0 or more");
  }

  if (!isMissing(input.lunchIn) && isMissing(input.lunchOut)) {
    throw new ValidationError("lunchIn needs a lunchOut");
  }

  // Recorded times must run in order. Skipped steps (no lunch, still timed in) are simply left out.
  const recorded = TIME_FIELDS.filter((field) => !isMissing(input[field]));
  for (let i = 1; i < recorded.length; i++) {
    if (new Date(input[recorded[i]]) < new Date(input[recorded[i - 1]])) {
      throw new ValidationError(`${recorded[i]} cannot be before ${recorded[i - 1]}`);
    }
  }
}

/**
 * Whitelists the writable fields, turns the times into Dates (blank ones become null), and fills in
 * what is derived from them: the working day and the hours worked.
 */
export function pickAttendanceFields(input) {
  const picked = pickFields(input, ALLOWED);

  for (const field of TIME_FIELDS) {
    if (field in picked) picked[field] = toTime(picked[field]);
  }
  if ("hourlyRate" in picked) picked.hourlyRate = isMissing(picked.hourlyRate) ? undefined : Number(picked.hourlyRate);
  if (picked.timeIn) picked.date = toDay(picked.timeIn);

  picked.hoursWorked = computeHoursWorked({ ...input, ...picked });
  return picked;
}
