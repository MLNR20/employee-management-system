import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const REQUIRED = ["name", "startTime", "endTime"];
const ALLOWED = [...REQUIRED, "lunchMinutes", "graceMinutes", "workDays", "isActive"];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const isWholeNumber = (value) => Number.isInteger(Number(value)) && !isMissing(value);

/** "08:30" to minutes after midnight. */
export const toMinutes = (time) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/**
 * Throws ValidationError unless the shift is complete: a name, start and end as "HH:MM" that are not
 * the same moment, a lunch of 0 to 240 minutes, a grace of 0 to 120 minutes, and at least one
 * weekday (0 to 6, none repeated).
 */
export function assertValidShift(input) {
  if (REQUIRED.some((field) => isMissing(input[field]) || (typeof input[field] === "string" && input[field].trim() === ""))) {
    throw new ValidationError("Send all required fields: name, startTime, endTime");
  }

  for (const field of ["startTime", "endTime"]) {
    if (!TIME.test(String(input[field]))) throw new ValidationError(`${field} must be a time like 08:30 (24-hour)`);
  }
  if (input.startTime === input.endTime) throw new ValidationError("startTime and endTime cannot be the same");

  const ranges = [
    ["lunchMinutes", 240],
    ["graceMinutes", 120],
  ];
  for (const [field, max] of ranges) {
    if (isMissing(input[field])) continue;
    if (!isWholeNumber(input[field]) || Number(input[field]) < 0 || Number(input[field]) > max) {
      throw new ValidationError(`${field} must be a whole number from 0 to ${max}`);
    }
  }

  if (input.workDays !== undefined) {
    const days = input.workDays;
    const valid =
      Array.isArray(days) &&
      days.length > 0 &&
      days.every((day) => WEEKDAYS.includes(day)) &&
      new Set(days).size === days.length;
    if (!valid) throw new ValidationError("workDays must list at least one weekday, 0 (Sunday) to 6 (Saturday), once each");
  }
}

/** Whitelists the writable fields, trims the name and keeps the weekdays sorted. */
export function pickShiftFields(input) {
  const picked = pickFields(input, ALLOWED);
  if (typeof picked.name === "string") picked.name = picked.name.trim();
  for (const field of ["lunchMinutes", "graceMinutes"]) {
    if (field in picked) picked[field] = isMissing(picked[field]) ? undefined : Number(picked[field]);
  }
  if (picked.workDays) picked.workDays = [...picked.workDays].sort((a, b) => a - b);
  return picked;
}

/** What makes two names the same: case and surrounding spaces do not count. */
export const nameKey = (name) => String(name).trim().toLowerCase();

/**
 * What makes two schedules the same: start, end, lunch and weekdays. The name and the grace period do
 * not count, so a second shift with identical hours under a different name is still a duplicate.
 */
export const scheduleKey = ({ startTime, endTime, lunchMinutes = 60, workDays = [1, 2, 3, 4, 5] }) =>
  `${startTime}-${endTime}-${Number(lunchMinutes)}-${[...workDays].sort((a, b) => a - b).join(",")}`;
