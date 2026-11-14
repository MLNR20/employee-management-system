import { Entity, baseProps } from "../Entity";

/** The four clock times of a working day, in the order they happen. */
export const ATTENDANCE_TIMES = ["timeIn", "lunchOut", "lunchIn", "timeOut"];

const pad = (number) => String(number).padStart(2, "0");

/** A stored time as the "YYYY-MM-DDTHH:mm" (local) text a datetime-local input shows and edits. */
export const toLocalInput = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** What a datetime-local input holds, as the UTC instant the server stores. Blank stays blank. */
export const fromLocalInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
};

/**
 * One employee's time record for a day. `hourlyRate` is only present when the signed-in
 * administrator is HR: the server leaves it out for everyone else.
 */
export class Attendance extends Entity {
  constructor({ employeeId, date, timeIn, lunchOut, lunchIn, timeOut, hoursWorked, hourlyRate, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.date = date;
    this.timeIn = timeIn;
    this.lunchOut = lunchOut;
    this.lunchIn = lunchIn;
    this.timeOut = timeOut;
    this.hoursWorked = hoursWorked;
    this.hourlyRate = hourlyRate;
  }

  /** Hours worked times the hourly rate, or undefined while the day is open or the rate is hidden. */
  get pay() {
    if (typeof this.hoursWorked !== "number" || typeof this.hourlyRate !== "number") return undefined;
    return Math.round(this.hoursWorked * this.hourlyRate * 100) / 100;
  }

  static fromApi(raw = {}) {
    return new Attendance({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      date: raw.date,
      timeIn: toLocalInput(raw.timeIn),
      lunchOut: toLocalInput(raw.lunchOut),
      lunchIn: toLocalInput(raw.lunchIn),
      timeOut: toLocalInput(raw.timeOut),
      hoursWorked: raw.hoursWorked ?? undefined,
      hourlyRate: raw.hourlyRate,
    });
  }
}
