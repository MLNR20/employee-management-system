import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";

const REQUIRED = ["name"];
const ALLOWED = [...REQUIRED, "description", "isActive"];

export const NAME_MAX = 60;
export const DESCRIPTION_MAX = 200;

/** Throws ValidationError unless the name is present and the text fields are of a sensible length. */
export function assertValidEmploymentType(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError("Send all required fields: name");
  }
  if (typeof input.name !== "string" || input.name.trim().length > NAME_MAX) {
    throw new ValidationError(`Name must be text of at most ${NAME_MAX} characters`);
  }
  if (!isMissing(input.description) && String(input.description).trim().length > DESCRIPTION_MAX) {
    throw new ValidationError(`Description must be at most ${DESCRIPTION_MAX} characters`);
  }
}

export const pickEmploymentTypeFields = (input) => pickFields(input, ALLOWED);

/** What makes a name unique: case and repeated spaces do not count, so "Part-time" and "part-time" clash. */
export const employmentTypeNameKey = (name) => String(name).trim().replace(/\s+/g, " ").toLowerCase();
