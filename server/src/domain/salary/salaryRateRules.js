import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const ALLOWED = ["employeeId", "hourlyRate", "effectiveFrom", "assignedBy", "remarks"];

/** Throws ValidationError unless there is an employee, a rate above 0 and (if given) a real date. */
export function assertValidSalaryRate(input) {
  if (isMissing(input.employeeId) || isMissing(input.hourlyRate)) {
    throw new ValidationError("Send all required fields: employeeId, hourlyRate");
  }

  const rate = Number(input.hourlyRate);
  if (Number.isNaN(rate) || rate <= 0) throw new ValidationError("hourlyRate must be a number above 0");

  if (!isMissing(input.effectiveFrom)) {
    const valid = /^\d{4}-\d{2}-\d{2}/.test(String(input.effectiveFrom)) && !Number.isNaN(new Date(input.effectiveFrom).getTime());
    if (!valid) throw new ValidationError("effectiveFrom must be a valid date (YYYY-MM-DD)");
  }
}

/** Whitelists the writable fields; the rate becomes a number and the date a "YYYY-MM-DD" day. */
export function pickSalaryRateFields(input) {
  const picked = pickFields(input, ALLOWED);
  picked.hourlyRate = Number(picked.hourlyRate);
  if (!isMissing(picked.effectiveFrom)) picked.effectiveFrom = new Date(picked.effectiveFrom).toISOString().slice(0, 10);
  return picked;
}
