import { Entity } from "../Entity.js";

export const LeaveStatus = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

/** A leave filed by an employee: which type, which dates, and where it stands. */
export class LeaveRequest extends Entity {
  constructor({
    employeeId,
    leaveTypeId,
    startDate,
    endDate,
    days,
    reason,
    status = LeaveStatus.PENDING,
    ...base
  } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.leaveTypeId = leaveTypeId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.days = days;
    this.reason = reason;
    this.status = status;
  }
}
