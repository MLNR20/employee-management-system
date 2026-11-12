import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const ALLOWED = ["name", "isPaid", "isActive"];

export function assertValidLeaveType(input) {
  if (isMissing(input.name)) {
    throw new ValidationError("Send all required fields: name");
  }
  // Strict: the string "false" would otherwise be stored as paid.
  if (input.isPaid !== undefined && typeof input.isPaid !== "boolean") {
    throw new ValidationError("isPaid must be true or false");
  }
}

export const pickLeaveTypeFields = (input) => pickFields(input, ALLOWED);
