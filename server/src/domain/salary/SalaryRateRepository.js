import { Repository } from "../Repository.js";

/** @extends {Repository<import("./SalaryRate").SalaryRate>} */
export class SalaryRateRepository extends Repository {
  /** @returns {Promise<import("./SalaryRate").SalaryRate[]>} newest effective date first */
  async findByEmployeeId(employeeId) {
    throw new Error("SalaryRateRepository.findByEmployeeId not implemented");
  }

  /**
   * The rate in force on a "YYYY-MM-DD" day: the latest assignment starting on or before it.
   * @returns {Promise<import("./SalaryRate").SalaryRate | null>}
   */
  async findEffective(employeeId, day) {
    throw new Error("SalaryRateRepository.findEffective not implemented");
  }
}
