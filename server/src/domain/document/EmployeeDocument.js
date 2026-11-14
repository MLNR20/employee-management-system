import { Entity } from "../Entity.js";

/** Where a submitted document stands. Only HR moves it to verified or rejected. */
export const DocumentStatus = Object.freeze({
  PENDING: "pending", // expected, nothing handed in yet
  RECEIVED: "received", // handed in, not checked
  VERIFIED: "verified", // checked and accepted
  REJECTED: "rejected", // checked and not accepted: the employee must hand in a new one
});

/** One employee's copy of one requirement. There is at most one record per employee and requirement. */
export class EmployeeDocument extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.employeeId
   * @param {string} props.requirementId
   * @param {string} [props.status] a DocumentStatus
   * @param {Date | null} [props.receivedAt]
   * @param {string | null} [props.expiryDate] "YYYY-MM-DD"
   * @param {string | null} [props.reviewedBy] administrator who verified or rejected it
   * @param {Date | null} [props.reviewedAt]
   * @param {string} [props.remarks] e.g. why it was rejected
   */
  constructor({
    employeeId,
    requirementId,
    status = DocumentStatus.RECEIVED,
    receivedAt = null,
    expiryDate = null,
    reviewedBy = null,
    reviewedAt = null,
    remarks = "",
    ...base
  } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.requirementId = requirementId;
    this.status = status;
    this.receivedAt = receivedAt;
    this.expiryDate = expiryDate;
    this.reviewedBy = reviewedBy;
    this.reviewedAt = reviewedAt;
    this.remarks = remarks;
  }
}
