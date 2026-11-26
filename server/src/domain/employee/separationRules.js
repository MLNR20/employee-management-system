import { ValidationError } from "../errors.js";
import { isMissing } from "../pickFields.js";

// Leaving the company. An offboarding records why and when an employee leaves and whether they may be
// hired again. The rehire tag is optional while the offboarding is in progress and required to complete it.

export const RehireStatus = Object.freeze({
  REHIREABLE: "rehireable",
  NON_REHIREABLE: "non_rehireable",
});

export const SeparationType = Object.freeze({
  RESIGNATION: "resignation",
  TERMINATION: "termination",
  END_OF_CONTRACT: "end_of_contract",
  RETIREMENT: "retirement",
  REDUNDANCY: "redundancy",
  OTHER: "other",
});

export const OffboardingStatus = Object.freeze({
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
});

export const NOTES_MAX = 500;

/** The fields of a separation that may be set by hand. The rest is stamped by the server. */
export const SEPARATION_FIELDS = ["separationType", "lastWorkingDay", "reason", "rehireStatus", "rehireNotes"];

const isDay = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Round trip so that a day that does not exist (31 February) is refused, not rolled over.
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const assertText = (value, label) => {
  if (isMissing(value)) return;
  if (typeof value !== "string" || value.trim().length > NOTES_MAX) {
    throw new ValidationError(`${label} must be text of at most ${NOTES_MAX} characters`);
  }
};

/**
 * Throws ValidationError unless the offboarding names how and when the employee leaves, and any rehire
 * tag is a known one. Tagging someone non-rehireable needs the reason, so the decision can be defended.
 */
export function assertValidSeparation(input) {
  if (isMissing(input.separationType) || isMissing(input.lastWorkingDay)) {
    throw new ValidationError("Send all required fields: separationType, lastWorkingDay");
  }
  if (!Object.values(SeparationType).includes(input.separationType)) {
    throw new ValidationError(`separationType must be one of: ${Object.values(SeparationType).join(", ")}`);
  }
  if (!isDay(input.lastWorkingDay)) {
    throw new ValidationError("lastWorkingDay must be a valid date (YYYY-MM-DD)");
  }
  if (!isMissing(input.rehireStatus) && !Object.values(RehireStatus).includes(input.rehireStatus)) {
    throw new ValidationError(`rehireStatus must be one of: ${Object.values(RehireStatus).join(", ")}`);
  }
  assertText(input.reason, "reason");
  assertText(input.rehireNotes, "rehireNotes");
  if (input.rehireStatus === RehireStatus.NON_REHIREABLE && !String(input.rehireNotes ?? "").trim()) {
    throw new ValidationError("Say why this employee is non-rehireable (rehireNotes)");
  }
}
