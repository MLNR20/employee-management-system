import { Entity, baseProps } from "../Entity";

export const LeaveStatus = Object.freeze({
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
});

export class LeaveType extends Entity {
  constructor({ name, isPaid = false, ...base } = {}) {
    super(base);
    this.name = name;
    this.isPaid = isPaid;
  }

  static fromApi(raw = {}) {
    return new LeaveType({ ...baseProps(raw), name: raw.name, isPaid: raw.isPaid });
  }
}

/** How much of one leave type an employee may take: the entitlement and what is left of it. */
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

  static fromApi(raw = {}) {
    return new LeaveBalance({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      leaveTypeId: raw.leaveTypeId,
      maxLeaves: raw.maxLeaves,
      availableLeaves: raw.availableLeaves,
    });
  }
}

/** A leave filed by an employee. Dates are kept as the API sends them ("YYYY-MM-DDT00:00:00.000Z"). */
export class LeaveRequest extends Entity {
  constructor({ employeeId, leaveTypeId, startDate, endDate, days, reason, status, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.leaveTypeId = leaveTypeId;
    this.startDate = startDate;
    this.endDate = endDate;
    this.days = days;
    this.reason = reason;
    this.status = status;
  }

  static fromApi(raw = {}) {
    return new LeaveRequest({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      leaveTypeId: raw.leaveTypeId,
      startDate: raw.startDate,
      endDate: raw.endDate,
      days: raw.days,
      reason: raw.reason,
      status: raw.status,
    });
  }
}

/** Who decided a leave request, and how. `dateCreated` is the moment of the decision. */
export class LeaveApproval extends Entity {
  constructor({ leaveRequestId, approverId, decision, remarks, ...base } = {}) {
    super(base);
    this.leaveRequestId = leaveRequestId;
    this.approverId = approverId;
    this.decision = decision;
    this.remarks = remarks;
  }

  static fromApi(raw = {}) {
    return new LeaveApproval({
      ...baseProps(raw),
      leaveRequestId: raw.leaveRequestId,
      approverId: raw.approverId,
      decision: raw.decision,
      remarks: raw.remarks,
    });
  }
}

/** Dates arrive as UTC midnight; show the calendar date itself so no time zone can shift the day. */
export const dateOnly = (value) => (value ? String(value).slice(0, 10) : "");
