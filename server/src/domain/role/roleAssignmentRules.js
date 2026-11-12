import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const REQUIRED = ["administratorId", "roleId"];
const ALLOWED = [...REQUIRED, "isActive"];

export function assertValidRoleAssignment(input) {
  if (REQUIRED.some((field) => isMissing(input[field]) || typeof input[field] !== "string")) {
    throw new ValidationError("Send all required fields: administratorId, roleId");
  }
}

export const pickRoleAssignmentFields = (input) => pickFields(input, ALLOWED);
