import { Entity } from "../Entity.js";

/**
 * How much of one leave type an employee may take: `maxLeaves` is the
 * entitlement, `availableLeaves` what is still left of it.
 * An employee has at most one balance per leave type.
 */
export class LeaveBalance extends Entity {
  constructor({ employeeId, leaveTypeId, maxLeaves, availableLeaves, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.leaveTypeId = leaveTypeId;
    this.maxLeaves = maxLeaves;
    this.availableLeaves = availableLeaves;
  }

  get usedLeaves() {
    return this.maxLeaves - this.availableLeaves;
  }
}
