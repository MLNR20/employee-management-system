import { Entity } from "../Entity.js";

/**
 * One hourly rate assigned to an employee from a given day. Assignments are a history: a raise is a
 * new assignment with a later `effectiveFrom`, and the rate in force on any day is the latest one
 * that started on or before it.
 */
export class SalaryRate extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.employeeId
   * @param {number} props.hourlyRate
   * @param {string} props.effectiveFrom "YYYY-MM-DD" (UTC), the first day the rate applies
   * @param {string} props.assignedBy id of the administrator who assigned it
   * @param {string} [props.remarks]
   */
  constructor({ employeeId, hourlyRate, effectiveFrom, assignedBy, remarks = "", ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.hourlyRate = hourlyRate;
    this.effectiveFrom = effectiveFrom;
    this.assignedBy = assignedBy;
    this.remarks = remarks;
  }
}
