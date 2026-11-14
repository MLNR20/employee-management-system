import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const ALLOWED = ["employeeId", "shiftId", "effectiveFrom", "assignedBy"];

/** Throws ValidationError unless there is an employee, a shift and (if given) a real date. */
export function assertValidShiftAssignment(input) {
  if (isMissing(input.employeeId) || isMissing(input.shiftId)) {
    throw new ValidationError("Send all required fields: employeeId, shiftId");
  }
  if (!isMissing(input.effectiveFrom)) {
    const valid =
      /^\d{4}-\d{2}-\d{2}/.test(String(input.effectiveFrom)) && !Number.isNaN(new Date(input.effectiveFrom).getTime());
    if (!valid) throw new ValidationError("effectiveFrom must be a valid date (YYYY-MM-DD)");
  }
}

/** Whitelists the writable fields; the date becomes a "YYYY-MM-DD" day. */
export function pickShiftAssignmentFields(input) {
  const picked = pickFields(input, ALLOWED);
  if (!isMissing(picked.effectiveFrom)) picked.effectiveFrom = new Date(picked.effectiveFrom).toISOString().slice(0, 10);
  return picked;
}
