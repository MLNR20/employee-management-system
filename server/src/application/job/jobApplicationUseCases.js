import { createCrudUseCases } from "../shared/crudUseCases.js";
import {
  DuplicateJobApplicationError,
  InvalidStateError,
  NotFoundError,
} from "../../domain/errors.js";
import { JobStatus } from "../../domain/job/Job.js";
import { ApplicationStatus } from "../../domain/job/JobApplication.js";
import {
  assertValidApplication,
  assertValidApplicationStatus,
  pickApplicationFields,
} from "../../domain/job/jobApplicationRules.js";

/**
 * Employees applying to jobs, and HR following the applications up. The applicant is always passed
 * in by the caller (the signed-in employee), never read from the request body.
 *
 * @param {Object} deps
 * @param {import("../../domain/job/JobApplicationRepository").JobApplicationRepository} deps.jobApplicationRepository
 * @param {import("../../domain/job/JobRepository").JobRepository} deps.jobRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {() => Date} [deps.now]
 */
export const createJobApplicationUseCases = ({
  jobApplicationRepository,
  jobRepository,
  employeeRepository,
  now = () => new Date(),
}) => {
  const crud = createCrudUseCases({
    repository: jobApplicationRepository,
    entityName: "Job application",
    validate: assertValidApplication,
    pickFields: pickApplicationFields,
  });

  return {
    listApplications: crud.list,
    listApplicationsPage: crud.listPage,
    getApplication: crud.get,

    /** Files an application for the employee: a resume link for one open job, once per job. */
    async apply(employeeId, input = {}) {
      assertValidApplication(input);

      const employee = await employeeRepository.findById(employeeId);
      if (!employee || employee.isActive === false) throw new NotFoundError("Employee not found");

      const job = await jobRepository.findById(input.jobId);
      if (!job || job.isActive === false) throw new NotFoundError("Job not found");
      if (job.status !== JobStatus.OPEN) throw new InvalidStateError("This job is not open for applications");

      const mine = await jobApplicationRepository.findByEmployeeId(employeeId);
      if (mine.some((application) => application.jobId === input.jobId)) throw new DuplicateJobApplicationError();

      return jobApplicationRepository.create({
        ...pickApplicationFields(input),
        employeeId, // the signed-in employee, whatever the body said
        status: ApplicationStatus.SUBMITTED,
        dateSubmitted: now(),
      });
    },

    /** The employee's own applications, newest first. */
    async listForEmployee(employeeId) {
      return jobApplicationRepository.findByEmployeeId(employeeId);
    },

    /** Everyone who applied to one job, newest first. */
    async listForJob(jobId) {
      if (!(await jobRepository.findById(jobId))) throw new NotFoundError("Job not found");
      return jobApplicationRepository.findByJobId(jobId);
    },

    /** HR moves an application to a new status, e.g. "under_review" or "accepted". */
    async updateStatus(id, status) {
      assertValidApplicationStatus(status);
      const application = await jobApplicationRepository.update(id, { status });
      if (!application) throw new NotFoundError("Job application not found");
      return application;
    },
  };
};
