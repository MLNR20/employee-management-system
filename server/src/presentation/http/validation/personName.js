import { body } from "express-validator";
import { validate } from "./validate.js";

export const NAME_MIN_LENGTH = 2;

// Letters only (accented ones included, so "Peña" is fine). Digits, spaces, hyphens and every
// other symbol are refused.
export const NAME_PATTERN = /^\p{L}+$/u;

/**
 * A validator chain for one person-name field. A missing or blank value passes here: whether the
 * field is required is the business rule of each use case, which gives its own "send all required
 * fields" message. A value that is sent must be text of at least 2 letters.
 */
export const personName = (field, label) =>
  body(field)
    .optional({ values: "falsy" })
    .isString()
    .withMessage(`${label} must be text`)
    .bail()
    .trim()
    .isLength({ min: NAME_MIN_LENGTH })
    .withMessage(`${label} must be at least ${NAME_MIN_LENGTH} characters`)
    .bail()
    .matches(NAME_PATTERN)
    .withMessage(`${label} must contain letters only`);

export const validateEmployeeNames = validate(
  personName("first_name", "First name"),
  personName("last_name", "Last name")
);

export const validateEmergencyContactNames = validate(
  personName("firstName", "First name"),
  personName("lastName", "Last name")
);
