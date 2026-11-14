import { createCrudUseCases } from "../shared/crudUseCases.js";
import { JobInUseError, NotFoundError } from "../../domain/errors.js";
import { assertValidJob, pickJobFields } from "../../domain/job/jobRules.js";

/**
 * Job postings. A job that has applications is closed rather than deleted, so those applications
 * keep pointing at a real job.
 *
 * @param {Object} deps
 * @param {import("../../domain/job/JobRepository").JobRepository} deps.jobRepository
 * @param {import("../../domain/job/JobApplicationRepository").JobApplicationRepository} deps.jobApplicationRepository
 */
export const createJobUseCases = ({ jobRepository, jobApplicationRepository }) => {
  const crud = createCrudUseCases({
    repository: jobRepository,
    entityName: "Job",
    validate: assertValidJob,
    pickFields: pickJobFields,
  });

  return {
    listJobs: crud.list,
    listJobsPage: crud.listPage,
    getJob: crud.get,
    addJob: crud.add,
    updateJob: crud.update,

    /** The jobs employees can apply to right now. */
    listOpenJobs: () => jobRepository.findOpen(),

    async deleteJob(id) {
      if (!(await jobRepository.findById(id))) throw new NotFoundError("Job not found");
      if (await jobApplicationRepository.existsForJob(id)) throw new JobInUseError();
      return crud.remove(id);
    },
  };
};
