// Pure helpers behind FormBuilder: no React, so they are easy to test and reuse.
//
// field: {
//   name, label,
//   type?:      "text" (default) | "email" | "number" | "password" | "date" | "textarea" | "checkbox" | "checkboxes" | "select"
//   required?:  boolean
//   minLength?, maxLength?, min?, max?
//   pattern?:   RegExp, with patternMessage? for the error text
//   validate?:  (value, allValues) => string | undefined   custom rule, returns the error message
//   default?:   starting value
//   hint?:      small help text under the input
//   options?:   [{ value, label }]                 for "select" and "checkboxes" (which holds an array of the chosen values)
//   optionsFrom?: { useList, value(item), label(item) }   for "select", loaded from another resource
//   wide?:      span both columns
// }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emptyValue = (field) =>
  field.default ?? (field.type === "checkbox" ? false : field.type === "checkboxes" ? [] : "");

/** Starting values for a form: from a loaded entity when given, otherwise each field's default. */
export const initialValuesFor = (fields, source) =>
  Object.fromEntries(
    fields.map((field) => {
      const stored = source?.[field.name];
      if (stored === undefined || stored === null) return [field.name, emptyValue(field)];
      return [field.name, field.type === "checkbox" ? Boolean(stored) : stored];
    })
  );

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

/** Returns { fieldName: message } for every field that breaks a rule; empty when valid. */
export function validateFields(fields, values) {
  const errors = {};

  for (const field of fields) {
    if (field.type === "checkbox") continue;

    const raw = values[field.name];
    const label = field.label ?? field.name;

    if (isBlank(raw)) {
      if (field.required) errors[field.name] = `${label} is required.`;
      continue; // optional and empty: no further rules apply
    }

    const text = String(raw).trim();
    let message;

    if (field.minLength && text.length < field.minLength) {
      message = `${label} must be at least ${field.minLength} characters.`;
    } else if (field.maxLength && text.length > field.maxLength) {
      message = `${label} must be at most ${field.maxLength} characters.`;
    } else if (field.type === "email" && !EMAIL.test(text)) {
      message = "Enter a valid email address.";
    } else if (field.type === "number") {
      const number = Number(text);
      if (Number.isNaN(number)) message = `${label} must be a number.`;
      else if (field.min !== undefined && number < field.min) message = `${label} must be at least ${field.min}.`;
      else if (field.max !== undefined && number > field.max) message = `${label} must be at most ${field.max}.`;
    } else if (field.pattern && !field.pattern.test(text)) {
      message = field.patternMessage ?? `${label} is not in the right format.`;
    }

    message ??= field.validate?.(raw, values);
    if (message) errors[field.name] = message;
  }

  return errors;
}

/** The submit payload: strings trimmed, number fields as numbers, blank optional numbers left out. */
export function toPayload(fields, values) {
  const payload = {};

  for (const field of fields) {
    const value = values[field.name];

    if (field.type === "number") {
      if (!isBlank(value)) payload[field.name] = Number(value);
    } else {
      payload[field.name] = typeof value === "string" ? value.trim() : value;
    }
  }

  return payload;
}
