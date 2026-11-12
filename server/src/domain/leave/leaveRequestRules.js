import { ValidationError } from "../errors.js";
import { isMissing } from "../pickFields.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parses "YYYY-MM-DD" into a UTC midnight Date, or null for anything else (including 2024-02-31). */
export function parseDateOnly(value) {
  if (typeof value !== "string" || !DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

/** Calendar days from start to end, both included. Weekends and holidays are not excluded. */
export const inclusiveDays = (start, end) => Math.round((end - start) / DAY_MS) + 1;

/**
 * Validates a new leave request and returns its parsed dates and day count.
 * @returns {{startDate: Date, endDate: Date, days: number}}
 */
export function validateLeaveRequest(input) {
  if (["employeeId", "leaveTypeId"].some((f) => isMissing(input[f]) || typeof input[f] !== "string")) {
    throw new ValidationError("Send all required fields: employeeId, leaveTypeId, startDate, endDate");
  }

  const startDate = parseDateOnly(input.startDate);
  const endDate = parseDateOnly(input.endDate);
  if (!startDate || !endDate) {
    throw new ValidationError("startDate and endDate must be real dates written as YYYY-MM-DD");
  }
  if (endDate < startDate) {
    throw new ValidationError("endDate cannot be before startDate");
  }
  if (input.reason !== undefined && typeof input.reason !== "string") {
    throw new ValidationError("reason must be text");
  }

  return { startDate, endDate, days: inclusiveDays(startDate, endDate) };
}
