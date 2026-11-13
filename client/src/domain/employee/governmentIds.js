// Philippine government ID numbers an employee can have. All optional.
// The server stores digits only; here they are shown with dashes for readability.
//   groups: how the digits are split for display, e.g. SSS 12-3456789-0 is [2, 7, 1]

export const governmentIds = [
  { name: "sssNumber", label: "SSS number", lengths: [10], groups: [2, 7, 1], placeholder: "00-0000000-0" },
  { name: "tinNumber", label: "TIN", lengths: [9, 12], groups: [3, 3, 3, 3], placeholder: "000-000-000-000" },
  { name: "philhealthNumber", label: "PhilHealth number", lengths: [12], groups: [2, 9, 1], placeholder: "00-000000000-0" },
  { name: "pagibigNumber", label: "Pag-IBIG number", lengths: [12], groups: [4, 4, 4], placeholder: "0000-0000-0000" },
];

const digitsOf = (value) => String(value ?? "").replace(/[\s-]/g, "");

/** "1234567890" -> "12-3456789-0". Anything that is not digits is returned as typed. */
export function formatGovernmentId(def, value) {
  const digits = digitsOf(value);
  if (!/^\d+$/.test(digits)) return String(value ?? "");

  const parts = [];
  let position = 0;
  for (const size of def.groups) {
    if (position >= digits.length) break;
    parts.push(digits.slice(position, position + size));
    position += size;
  }
  if (position < digits.length) parts.push(digits.slice(position));
  return parts.join("-");
}

/** { sssNumber: "message" } for each ID that is filled in wrongly; empty when all are fine or blank. */
export function validateGovernmentIds(values) {
  const errors = {};
  for (const def of governmentIds) {
    const digits = digitsOf(values[def.name]);
    if (digits === "") continue;
    if (!/^\d+$/.test(digits) || !def.lengths.includes(digits.length)) {
      errors[def.name] = `${def.label} must be ${def.lengths.join(" or ")} digits.`;
    }
  }
  return errors;
}

/** Starting form values from a loaded employee, formatted for display. */
export const governmentIdValues = (employee) =>
  Object.fromEntries(governmentIds.map((def) => [def.name, formatGovernmentId(def, employee?.[def.name])]));
