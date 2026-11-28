import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const ALLOWED = ["name", "departmentId", "isActive"];

export function assertValidPosition(input) {
  if (isMissing(input.name) || String(input.name).trim() === "" || isMissing(input.departmentId)) {
    throw new ValidationError("Send all required fields: name, departmentId");
  }
  if (typeof input.departmentId !== "string") throw new ValidationError("departmentId must be the id of a department");
}

export function pickPositionFields(input) {
  const picked = pickFields(input, ALLOWED);
  if (typeof picked.name === "string") picked.name = picked.name.trim();
  return picked;
}
