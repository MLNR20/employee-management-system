import { Repository } from "../Repository.js";

/**
 * Job persistence contract. Everything is inherited from the generic Repository.
 * @extends {Repository<import("./Job").Job>}
 */
export class JobRepository extends Repository {
  /** @returns {Promise<import("./Job").Job[]>} the active jobs that are open for applications, newest first */
  async findOpen() {
    throw new Error("JobRepository.findOpen not implemented");
  }
}
