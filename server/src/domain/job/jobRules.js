import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { JobStatus } from "./Job.js";

const REQUIRED = ["jobTitle", "jobDescription"];
const ALLOWED = [...REQUIRED, "status", "isActive"];
const STATUSES = Object.values(JobStatus);

/** Throws ValidationError unless the job has a title, a description and (if given) a known status. */
export function assertValidJob(input) {
  if (REQUIRED.some((field) => isMissing(input[field]) || String(input[field]).trim() === "")) {
    throw new ValidationError("Send all required fields: jobTitle, jobDescription");
  }

  if (!isMissing(input.status) && !STATUSES.includes(input.status)) {
    throw new ValidationError(`status must be one of: ${STATUSES.join(", ")}`);
  }
}

/** Whitelists the writable fields. */
export const pickJobFields = (input) => pickFields(input, ALLOWED);
