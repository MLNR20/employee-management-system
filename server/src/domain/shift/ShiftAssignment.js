import { Entity } from "../Entity.js";

/**
 * An employee's shift from a given day. Assignments are a history, like salary rates: moving someone
 * to another shift is a new assignment with a later `effectiveFrom`, and the shift on any day is the
 * latest assignment that started on or before it.
 */
export class ShiftAssignment extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.employeeId
   * @param {string} props.shiftId
   * @param {string} props.effectiveFrom "YYYY-MM-DD", the first day the shift applies
   * @param {string} props.assignedBy id of the administrator who made the assignment
   */
  constructor({ employeeId, shiftId, effectiveFrom, assignedBy, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.shiftId = shiftId;
    this.effectiveFrom = effectiveFrom;
    this.assignedBy = assignedBy;
  }
}
