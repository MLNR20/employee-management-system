import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const REQUIRED = ["first_name", "last_name", "email", "position", "department", "salary"];
const ALLOWED = [...REQUIRED, "isActive"];

/** Throws ValidationError unless every required employee field is present. */
export function assertValidEmployee(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError(
      "Send all required fields: first name, last name, email, position, department, salary"
    );
  }
}

export const pickEmployeeFields = (input) => pickFields(input, ALLOWED);
