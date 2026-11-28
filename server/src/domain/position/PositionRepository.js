import { Repository } from "../Repository.js";

/** @extends {Repository<import("./Position").Position>} */
export class PositionRepository extends Repository {
  /** @returns {Promise<boolean>} whether any position belongs to this department */
  async existsForDepartment(departmentId) {
    throw new Error("PositionRepository.existsForDepartment not implemented");
  }
}
