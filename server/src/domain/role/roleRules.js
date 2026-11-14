import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { isValidPermission } from "./permissions.js";

const ALLOWED = ["name", "description", "isActive", "permissions"];

export function assertValidRole(input) {
  if (isMissing(input.name)) {
    throw new ValidationError("Send all required fields: name");
  }

  if (input.permissions !== undefined) {
    if (!Array.isArray(input.permissions)) {
      throw new ValidationError("permissions must be a list");
    }
    const unknown = input.permissions.filter((permission) => !isValidPermission(permission));
    if (unknown.length) {
      throw new ValidationError(`Unknown permission: ${unknown.join(", ")}`);
    }
  }
}

export const pickRoleFields = (input) => {
  const fields = pickFields(input, ALLOWED);
  if (fields.permissions) fields.permissions = [...new Set(fields.permissions)];
  return fields;
};
