import { Repository } from "../Repository.js";

/** @extends {Repository<import("./JobApplication").JobApplication>} */
export class JobApplicationRepository extends Repository {
  /** @returns {Promise<import("./JobApplication").JobApplication[]>} newest first */
  async findByEmployeeId(employeeId) {
    throw new Error("JobApplicationRepository.findByEmployeeId not implemented");
  }

  /** @returns {Promise<import("./JobApplication").JobApplication[]>} newest first */
  async findByJobId(jobId) {
    throw new Error("JobApplicationRepository.findByJobId not implemented");
  }

  /** @returns {Promise<boolean>} whether anyone has applied to this job */
  async existsForJob(jobId) {
    throw new Error("JobApplicationRepository.existsForJob not implemented");
  }
}
