import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { GOVERNMENT_ID_FIELDS, assertValidGovernmentIds, normalizeGovernmentId } from "./governmentIds.js";

const REQUIRED = ["first_name", "last_name", "email", "position", "department", "salary"];
const ALLOWED = [...REQUIRED, ...GOVERNMENT_ID_FIELDS, "isActive"];

/** Throws ValidationError unless every required employee field is present. */
export function assertValidEmployee(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError(
      "Send all required fields: first name, last name, email, position, department, salary"
    );
  }
  assertValidGovernmentIds(input);
}

/** Whitelists the writable fields and stores government ID numbers as digits only. */
export const pickEmployeeFields = (input) => {
  const picked = pickFields(input, ALLOWED);
  for (const field of GOVERNMENT_ID_FIELDS) {
    if (field in picked) picked[field] = normalizeGovernmentId(picked[field]);
  }
  return picked;
};
