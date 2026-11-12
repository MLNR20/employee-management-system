/** Keeps only the allowed fields and drops undefined ones (no mass assignment). */
export const pickFields = (input, allowed) =>
  Object.fromEntries(
    allowed.filter((field) => input[field] !== undefined).map((field) => [field, input[field]])
  );

export const isMissing = (value) => value === undefined || value === null || value === "";
