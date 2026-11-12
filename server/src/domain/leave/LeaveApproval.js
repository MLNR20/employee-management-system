import { Entity } from "../Entity.js";

export const ApprovalDecision = Object.freeze({
  APPROVED: "approved",
  REJECTED: "rejected",
});

/**
 * Records who decided a leave request and how. `dateCreated` is the moment of
 * the decision. Approvals are history: they are written once and never edited.
 */
export class LeaveApproval extends Entity {
  constructor({ leaveRequestId, approverId, decision, remarks, ...base } = {}) {
    super(base);
    this.leaveRequestId = leaveRequestId;
    this.approverId = approverId;
    this.decision = decision;
    this.remarks = remarks;
  }
}
