// Offboarding and the rehire tag, as the screens see them. The server enforces the same rules.

export const RehireStatus = Object.freeze({
  REHIREABLE: "rehireable",
  NON_REHIREABLE: "non_rehireable",
});

export const OffboardingStatus = Object.freeze({
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
});

export const REHIRE_OPTIONS = [
  { value: RehireStatus.REHIREABLE, label: "Rehireable" },
  { value: RehireStatus.NON_REHIREABLE, label: "Non-rehireable" },
];

export const SEPARATION_TYPES = [
  { value: "resignation", label: "Resignation" },
  { value: "termination", label: "Termination" },
  { value: "end_of_contract", label: "End of contract" },
  { value: "retirement", label: "Retirement" },
  { value: "redundancy", label: "Redundancy" },
  { value: "other", label: "Other" },
];

export const NOTES_MAX = 500;

const labelIn = (options, value) => options.find((option) => option.value === value)?.label ?? "";

export const separationTypeLabel = (value) => labelIn(SEPARATION_TYPES, value);

/**
 * The tag to show for an employee: their rehire tag, "Not tagged" for someone who has left or is
 * leaving without one, and "" for a current employee, who needs none.
 */
export const rehireTagLabel = ({ rehireStatus, isActive, separation }) => {
  if (rehireStatus) return labelIn(REHIRE_OPTIONS, rehireStatus);
  return !isActive || separation ? "Not tagged" : "";
};

/** Where an employee stands: "active", "offboarding", "offboarded" or "inactive" (left without an offboarding). */
export const employmentStage = ({ isActive, separation }) => {
  if (separation?.status === OffboardingStatus.COMPLETED) return "offboarded";
  if (separation) return "offboarding";
  return isActive ? "active" : "inactive";
};

/** Returns { field: message } for the offboarding form; empty when it can be sent. */
export const validateSeparation = ({ separationType, lastWorkingDay, rehireStatus, rehireNotes }) => {
  const errors = {};
  if (!separationType) errors.separationType = "Choose how the employee is leaving.";
  if (!lastWorkingDay) errors.lastWorkingDay = "Enter the last working day.";
  if (rehireStatus === RehireStatus.NON_REHIREABLE && !rehireNotes?.trim()) {
    errors.rehireNotes = "Say why this employee is non-rehireable.";
  }
  return errors;
};
