import { ValidationError } from "../errors.js";
import { isMissing } from "../pickFields.js";

/**
 * Philippine government ID numbers an employee can have. All optional.
 * They are stored as digits only; dashes and spaces typed by the user are dropped.
 */
export const GOVERNMENT_IDS = Object.freeze({
  sssNumber: { label: "SSS number", lengths: [10] },
  tinNumber: { label: "TIN", lengths: [9, 12] },
  philhealthNumber: { label: "PhilHealth number", lengths: [12] },
  pagibigNumber: { label: "Pag-IBIG number", lengths: [12] },
});

export const GOVERNMENT_ID_FIELDS = Object.keys(GOVERNMENT_IDS);

/** "12-3456789-0" -> "1234567890". Anything that is not a digit, dash or space is kept so validation can reject it. */
export const normalizeGovernmentId = (value) => (isMissing(value) ? "" : String(value).replace(/[\s-]/g, ""));

/** Throws ValidationError when a given ID is not all digits or has the wrong number of them. A blank ID is fine. */
export function assertValidGovernmentIds(input) {
  for (const [field, { label, lengths }] of Object.entries(GOVERNMENT_IDS)) {
    const digits = normalizeGovernmentId(input[field]);
    if (digits === "") continue;
    if (!/^\d+$/.test(digits) || !lengths.includes(digits.length)) {
      throw new ValidationError(`${label} must be ${lengths.join(" or ")} digits`);
    }
  }
}
