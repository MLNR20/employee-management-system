import { Entity } from "../Entity.js";

/**
 * One employee's working day: when they timed in, went to lunch and came back, and timed out.
 * The hourly rate is copied onto the record at time in, so a later raise never rewrites what a
 * past day was worth. `hoursWorked` stays null until the employee has timed out.
 */
export class Attendance extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.employeeId
   * @param {string} props.date the working day, "YYYY-MM-DD" (UTC), taken from timeIn
   * @param {Date} props.timeIn
   * @param {Date | null} [props.lunchOut]
   * @param {Date | null} [props.lunchIn]
   * @param {Date | null} [props.timeOut]
   * @param {number} props.hourlyRate rate in force when the employee timed in
   * @param {number | null} [props.hoursWorked] time in to time out, less the lunch break
   * @param {string | null} [props.shiftId] the shift the employee was on that day, when they had one
   * @param {number} [props.lateMinutes] minutes late at time in, 0 when on time or without a shift
   */
  constructor({
    employeeId,
    date,
    timeIn,
    lunchOut = null,
    lunchIn = null,
    timeOut = null,
    hourlyRate,
    hoursWorked = null,
    shiftId = null,
    lateMinutes = 0,
    ...base
  } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.date = date;
    this.timeIn = timeIn;
    this.lunchOut = lunchOut;
    this.lunchIn = lunchIn;
    this.timeOut = timeOut;
    this.hourlyRate = hourlyRate;
    this.hoursWorked = hoursWorked;
    this.shiftId = shiftId;
    this.lateMinutes = lateMinutes;
  }
}
