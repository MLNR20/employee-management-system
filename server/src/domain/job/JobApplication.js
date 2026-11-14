import { Entity } from "../Entity.js";

/** Where an application stands. It starts "submitted" and HR moves it along. */
export const ApplicationStatus = Object.freeze({
  SUBMITTED: "submitted",
  UNDER_REVIEW: "under_review",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
});

/** One employee's application to one job, with a link to their resume. */
export class JobApplication extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.employeeId the applicant
   * @param {string} props.jobId
   * @param {string} props.resumeLink http(s) link to the resume
   * @param {string} [props.status] one of ApplicationStatus (default "submitted")
   * @param {Date} [props.dateSubmitted] set when the application is filed
   */
  constructor({
    employeeId,
    jobId,
    resumeLink,
    status = ApplicationStatus.SUBMITTED,
    dateSubmitted,
    ...base
  } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.jobId = jobId;
    this.resumeLink = resumeLink;
    this.status = status;
    this.dateSubmitted = dateSubmitted;
  }
}
