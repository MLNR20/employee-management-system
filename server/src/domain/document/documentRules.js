import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { DocumentStatus } from "./EmployeeDocument.js";

const REQUIREMENT_ALLOWED = ["name", "description", "isRequired", "hasExpiry", "isActive"];
const DOCUMENT_ALLOWED = ["employeeId", "requirementId", "status", "receivedAt", "expiryDate", "remarks"];

// Only these can be set by hand. Verified and rejected come from the review actions, which record who decided.
const HAND_SET_STATUSES = [DocumentStatus.PENDING, DocumentStatus.RECEIVED];

const isValidDate = (value) => !Number.isNaN(new Date(value).getTime());
const isDay = (value) => /^\d{4}-\d{2}-\d{2}/.test(String(value)) && isValidDate(value);

/** What makes two requirement names the same: case and surrounding spaces do not count. */
export const requirementNameKey = (name) => String(name).trim().toLowerCase();

export function assertValidRequirement(input) {
  if (isMissing(input.name) || String(input.name).trim() === "") {
    throw new ValidationError("Send all required fields: name");
  }
}

export function pickRequirementFields(input) {
  const picked = pickFields(input, REQUIREMENT_ALLOWED);
  if (typeof picked.name === "string") picked.name = picked.name.trim();
  return picked;
}

/**
 * Throws ValidationError unless the record names an employee and a requirement, has a status that may
 * be set by hand (when one is sent) and real dates.
 */
export function assertValidEmployeeDocument(input) {
  if (isMissing(input.employeeId) || isMissing(input.requirementId)) {
    throw new ValidationError("Send all required fields: employeeId, requirementId");
  }
  if (!isMissing(input.status) && !HAND_SET_STATUSES.includes(input.status)) {
    throw new ValidationError(
      `status must be one of: ${HAND_SET_STATUSES.join(", ")}. Use verify or reject to review a document.`
    );
  }
  if (!isMissing(input.receivedAt) && !isValidDate(input.receivedAt)) {
    throw new ValidationError("receivedAt must be a valid date");
  }
  if (!isMissing(input.expiryDate) && !isDay(input.expiryDate)) {
    throw new ValidationError("expiryDate must be a valid date (YYYY-MM-DD)");
  }
}

/** Whitelists the writable fields; the expiry becomes a "YYYY-MM-DD" day and blanks become null. */
export function pickEmployeeDocumentFields(input) {
  const picked = pickFields(input, DOCUMENT_ALLOWED);
  for (const field of ["receivedAt", "expiryDate"]) {
    if (field in picked && isMissing(picked[field])) picked[field] = null;
  }
  if (picked.receivedAt) picked.receivedAt = new Date(picked.receivedAt);
  if (picked.expiryDate) picked.expiryDate = new Date(picked.expiryDate).toISOString().slice(0, 10);
  return picked;
}

/**
 * Where one checklist line stands. A document that is received or verified but past its expiry is
 * "expired", and so is no better than none.
 * @returns {"missing" | "pending" | "received" | "verified" | "rejected" | "expired"}
 */
export function checklistState(document, today) {
  if (!document) return "missing";
  const live = document.status === DocumentStatus.RECEIVED || document.status === DocumentStatus.VERIFIED;
  if (live && document.expiryDate && document.expiryDate < today) return "expired";
  return document.status;
}
