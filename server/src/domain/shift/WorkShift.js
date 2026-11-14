import { Entity } from "../Entity.js";

/**
 * A named working pattern: when the day starts and ends, how long the lunch break is, how late is
 * still on time, and which weekdays it covers. Times are the workplace's local clock, "HH:MM".
 * An end earlier than the start means the shift runs overnight into the next day.
 *
 * A shift is never really removed: `deletedAt` marks it deleted (soft delete) so history that points
 * at it, such as past assignments and attendance, still makes sense.
 */
export class WorkShift extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.name
   * @param {string} props.startTime "HH:MM"
   * @param {string} props.endTime "HH:MM"
   * @param {number} [props.lunchMinutes] unpaid break length
   * @param {number} [props.graceMinutes] minutes after the start that still count as on time
   * @param {number[]} [props.workDays] weekdays covered, 0 = Sunday ... 6 = Saturday
   * @param {Date | null} [props.deletedAt] set when the shift was deleted
   */
  constructor({
    name,
    startTime,
    endTime,
    lunchMinutes = 60,
    graceMinutes = 0,
    workDays = [1, 2, 3, 4, 5],
    deletedAt = null,
    ...base
  } = {}) {
    super(base);
    this.name = name;
    this.startTime = startTime;
    this.endTime = endTime;
    this.lunchMinutes = lunchMinutes;
    this.graceMinutes = graceMinutes;
    this.workDays = workDays;
    this.deletedAt = deletedAt;
  }
}
