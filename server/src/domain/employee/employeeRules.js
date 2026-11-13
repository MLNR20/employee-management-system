import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { GOVERNMENT_ID_FIELDS, assertValidGovernmentIds, normalizeGovernmentId } from "./governmentIds.js";

const REQUIRED = ["first_name", "last_name", "email", "position", "department", "salary"];
const ALLOWED = [...REQUIRED, ...GOVERNMENT_ID_FIELDS, "isActive"]; // portalPassword is deliberately not stored as sent

export const PORTAL_PASSWORD_MIN = 8;
export const PORTAL_PASSWORD_MAX = 72; // bcrypt ignores everything past 72 bytes

/** Throws ValidationError unless every required employee field is present. */
export function assertValidEmployee(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError(
      "Send all required fields: first name, last name, email, position, department, salary"
    );
  }
  assertValidGovernmentIds(input);
  assertValidPortalPassword(input.portalPassword);
}

/** A portal password is optional; when one is sent it must be text of a sensible length. */
export function assertValidPortalPassword(password) {
    if (isMissing(password)) return;
    if (
      typeof password !== "string" ||
      password.length < PORTAL_PASSWORD_MIN ||
      password.length > PORTAL_PASSWORD_MAX
    ) {
      throw new ValidationError(
        `Portal password must be ${PORTAL_PASSWORD_MIN} to ${PORTAL_PASSWORD_MAX} characters`
      );
    }
}

/** Whitelists the writable fields and stores government ID numbers as digits only. */
export const pickEmployeeFields = (input) => {
  const picked = pickFields(input, ALLOWED);
  for (const field of GOVERNMENT_ID_FIELDS) {
    if (field in picked) picked[field] = normalizeGovernmentId(picked[field]);
  }
  return picked;
};
