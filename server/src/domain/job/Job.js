import { Entity } from "../Entity.js";

/** Whether a job is taking applications. Only an "open" job can be applied to. */
export const JobStatus = Object.freeze({
  OPEN: "open",
  CLOSED: "closed",
});

/** A position the company is hiring for. */
export class Job extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.jobTitle e.g. "Backend Developer"
   * @param {string} props.jobDescription what the role involves and what is expected
   * @param {string} [props.status] one of JobStatus (default "open")
   */
  constructor({ jobTitle, jobDescription, status = JobStatus.OPEN, ...base } = {}) {
    super(base);
    this.jobTitle = jobTitle;
    this.jobDescription = jobDescription;
    this.status = status;
  }
}
