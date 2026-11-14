import { Repository } from "../Repository.js";

/** @extends {Repository<import("./ShiftAssignment").ShiftAssignment>} */
export class ShiftAssignmentRepository extends Repository {
  /** @returns {Promise<import("./ShiftAssignment").ShiftAssignment[]>} newest effective date first */
  async findByEmployeeId(employeeId) {
    throw new Error("ShiftAssignmentRepository.findByEmployeeId not implemented");
  }

  /**
   * The assignment in force on a "YYYY-MM-DD" day: the latest one starting on or before it.
   * @returns {Promise<import("./ShiftAssignment").ShiftAssignment | null>}
   */
  async findEffective(employeeId, day) {
    throw new Error("ShiftAssignmentRepository.findEffective not implemented");
  }

  /** @returns {Promise<boolean>} whether any assignment points at this shift */
  async existsForShift(shiftId) {
    throw new Error("ShiftAssignmentRepository.existsForShift not implemented");
  }
}
