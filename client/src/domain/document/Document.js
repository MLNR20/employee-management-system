import { Entity, baseProps } from "../Entity";

const toDate = (value) => (value ? new Date(value) : null);

/** One line of the onboarding checklist: a document every new hire has to hand in. */
export class DocumentRequirement extends Entity {
  constructor({ name, description = "", isRequired = true, hasExpiry = false, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.isRequired = isRequired;
    this.hasExpiry = hasExpiry;
  }

  static fromApi(raw = {}) {
    return new DocumentRequirement({
      ...baseProps(raw),
      name: raw.name,
      description: raw.description,
      isRequired: raw.isRequired,
      hasExpiry: raw.hasExpiry,
    });
  }
}

/** What one employee handed in for one requirement, and whether HR has checked it. */
export class EmployeeDocument extends Entity {
  constructor({ employeeId, requirementId, status, receivedAt, expiryDate, reviewedBy, reviewedAt, remarks = "", ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.requirementId = requirementId;
    this.status = status;
    this.receivedAt = receivedAt;
    this.expiryDate = expiryDate; // "YYYY-MM-DD" or null
    this.reviewedBy = reviewedBy;
    this.reviewedAt = reviewedAt;
    this.remarks = remarks;
  }

  static fromApi(raw = {}) {
    return new EmployeeDocument({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      requirementId: raw.requirementId,
      status: raw.status,
      receivedAt: toDate(raw.receivedAt),
      expiryDate: raw.expiryDate ?? null,
      reviewedBy: raw.reviewedBy ?? null,
      reviewedAt: toDate(raw.reviewedAt),
      remarks: raw.remarks ?? "",
    });
  }
}

/**
 * Where a checklist line stands: "missing" (nothing recorded), "pending", "received", "verified",
 * "rejected", or "expired" (handed in but past its expiry date).
 */
export const ChecklistState = Object.freeze({
  MISSING: "missing",
  PENDING: "pending",
  RECEIVED: "received",
  VERIFIED: "verified",
  REJECTED: "rejected",
  EXPIRED: "expired",
});

/** The states from which HR may record a (new) copy as received. */
export const canReceive = (state) =>
  [ChecklistState.MISSING, ChecklistState.PENDING, ChecklistState.REJECTED, ChecklistState.EXPIRED].includes(state);

export const canVerify = (state) => state === ChecklistState.RECEIVED;

export const canReject = (state) => state === ChecklistState.RECEIVED || state === ChecklistState.VERIFIED;
