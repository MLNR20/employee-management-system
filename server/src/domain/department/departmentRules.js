import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const REQUIRED = ["name", "code"];
const ALLOWED = [...REQUIRED, "description", "isActive"];

/** Throws ValidationError unless name and code are present. */
export function assertValidDepartment(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError("Send all required fields: name, code");
  }
}

export const pickDepartmentFields = (input) => pickFields(input, ALLOWED);
