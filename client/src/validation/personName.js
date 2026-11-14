import { z } from "zod";

export const NAME_MIN_LENGTH = 2;

// Letters only (accented ones included, so "Peña" is fine). Digits, spaces, hyphens and every
// other symbol are refused.
// The server applies the same rule (presentation/http/validation/personName.js).
export const NAME_PATTERN = /^\p{L}+$/u;

/** A zod chain for a person's name: required, at least 2 characters, letters only. */
export const personNameSchema = (label) =>
  z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .min(NAME_MIN_LENGTH, `${label} must be at least ${NAME_MIN_LENGTH} characters.`)
    .regex(NAME_PATTERN, `${label} must contain letters only.`);

/** The first problem with a name, or undefined when it is fine. Handy for hand-written forms. */
export const validatePersonName = (label, value) => {
  const result = personNameSchema(label).safeParse(value ?? "");
  return result.success ? undefined : result.error.issues[0].message;
};
