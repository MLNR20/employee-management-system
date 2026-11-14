import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { ApplicationStatus } from "./JobApplication.js";

const STATUSES = Object.values(ApplicationStatus);

/** True for an absolute http or https URL, the only kind accepted as a resume link. */
export const isValidResumeLink = (value) => {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

/** Throws ValidationError unless there is a job and a resume link that is an http(s) URL. */
export function assertValidApplication(input) {
  if (isMissing(input.jobId) || isMissing(input.resumeLink)) {
    throw new ValidationError("Send all required fields: jobId, resumeLink");
  }
  if (!isValidResumeLink(input.resumeLink)) {
    throw new ValidationError("resumeLink must be a valid http or https link");
  }
}

/** Throws ValidationError unless the status is one of ApplicationStatus. */
export function assertValidApplicationStatus(status) {
  if (!STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${STATUSES.join(", ")}`);
  }
}

/** Whitelists what an applicant may send: never the status, the date or someone else's employeeId. */
export const pickApplicationFields = (input) => {
  const picked = pickFields(input, ["employeeId", "jobId", "resumeLink"]);
  picked.resumeLink = picked.resumeLink.trim();
  return picked;
};
