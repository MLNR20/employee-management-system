import { toMinutes } from "../shift/shiftRules.js";

// The workplace's local clock. Times are stored in UTC; shifts, lateness and the working day are in
// local time, which is UTC plus a fixed offset (the Philippines is +8 hours all year, no daylight saving).

const MS_PER_MINUTE = 60 * 1000;

/**
 * Breaks an instant into its local day, weekday and minutes after midnight.
 * @param {Date | string | number} instant
 * @param {number} utcOffsetMinutes e.g. 480 for UTC+8
 * @returns {{day: string, weekday: number, minutes: number}} day is "YYYY-MM-DD", weekday 0 = Sunday
 */
export function localParts(instant, utcOffsetMinutes = 0) {
  const shifted = new Date(new Date(instant).getTime() + utcOffsetMinutes * MS_PER_MINUTE);
  return {
    day: shifted.toISOString().slice(0, 10),
    weekday: shifted.getUTCDay(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

export const localDay = (instant, utcOffsetMinutes = 0) => localParts(instant, utcOffsetMinutes).day;

/**
 * How many minutes late a time in is for a shift: 0 on a day the shift does not cover or within the
 * grace period; past the grace period, the minutes after the shift's start.
 */
export function lateMinutesFor(shift, timeIn, utcOffsetMinutes = 0) {
  const { weekday, minutes } = localParts(timeIn, utcOffsetMinutes);
  if (!shift.workDays.includes(weekday)) return 0;

  const start = toMinutes(shift.startTime);
  return minutes > start + (shift.graceMinutes ?? 0) ? minutes - start : 0;
}
