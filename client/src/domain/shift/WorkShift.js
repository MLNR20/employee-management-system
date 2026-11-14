import { Entity, baseProps } from "../Entity";

export const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

/** "Mon–Fri", "Every day", or the days listed: how a shift's weekdays read in a table. */
export function describeDays(days = []) {
  const sorted = [...days].sort((a, b) => a - b);
  if (sorted.join() === "1,2,3,4,5") return "Mon–Fri";
  if (sorted.join() === "0,1,2,3,4,5,6") return "Every day";
  return sorted.map((day) => WEEKDAYS[day]?.label).join(", ");
}

/** "08:00 – 17:00", or "22:00 – 06:00 (+1 day)" for a shift that runs overnight. */
export const describeHours = ({ startTime, endTime }) =>
  `${startTime} – ${endTime}${endTime < startTime ? " (+1 day)" : ""}`;

export class WorkShift extends Entity {
  constructor({ name, startTime, endTime, lunchMinutes, graceMinutes, workDays = [], deletedAt = null, ...base } = {}) {
    super(base);
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
    this.lunchMinutes = lunchMinutes;
    this.graceMinutes = graceMinutes;
    this.workDays = workDays;
    this.deletedAt = deletedAt;
  }

  static fromApi(raw = {}) {
    return new WorkShift({
      ...baseProps(raw),
      name: raw.name,
      startTime: raw.startTime,
      endTime: raw.endTime,
      lunchMinutes: raw.lunchMinutes,
      graceMinutes: raw.graceMinutes,
      workDays: raw.workDays ?? [],
      deletedAt: raw.deletedAt ? new Date(raw.deletedAt) : null,
    });
  }
}

/** Puts one employee on one shift from a day on ("YYYY-MM-DD"). */
export class ShiftAssignment extends Entity {
  constructor({ employeeId, shiftId, effectiveFrom, assignedBy, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.shiftId = shiftId;
    this.effectiveFrom = effectiveFrom;
    this.assignedBy = assignedBy;
  }

  static fromApi(raw = {}) {
    return new ShiftAssignment({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      shiftId: raw.shiftId,
      effectiveFrom: raw.effectiveFrom,
      assignedBy: raw.assignedBy,
    });
  }
}
