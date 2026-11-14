import { Repository } from "../Repository.js";

/** @extends {Repository<import("./Attendance").Attendance>} */
export class AttendanceRepository extends Repository {
  /** @returns {Promise<import("./Attendance").Attendance | null>} the employee's record for that "YYYY-MM-DD" day */
  async findByEmployeeAndDate(employeeId, date) {
    throw new Error("AttendanceRepository.findByEmployeeAndDate not implemented");
  }

  /**
   * The employee's record that has no time out yet (the latest one, if several).
   * @returns {Promise<import("./Attendance").Attendance | null>}
   */
  async findOpenByEmployeeId(employeeId) {
    throw new Error("AttendanceRepository.findOpenByEmployeeId not implemented");
  }
}
