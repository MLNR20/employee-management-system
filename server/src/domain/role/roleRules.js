import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const ALLOWED = ["name", "description", "isActive"];

export function assertValidRole(input) {
  if (isMissing(input.name)) {
    throw new ValidationError("Send all required fields: name");
  }
}

export const pickRoleFields = (input) => pickFields(input, ALLOWED);
