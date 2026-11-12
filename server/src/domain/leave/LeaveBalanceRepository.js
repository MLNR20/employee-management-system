import { Repository } from "../Repository.js";

/** @extends {Repository<import("./LeaveBalance").LeaveBalance>} */
export class LeaveBalanceRepository extends Repository {
  /** @returns {Promise<import("./LeaveBalance").LeaveBalance[]>} */
  async findByEmployeeId(employeeId) {
    throw new Error("LeaveBalanceRepository.findByEmployeeId not implemented");
  }

  /** @returns {Promise<import("./LeaveBalance").LeaveBalance | null>} */
  async findByEmployeeAndType(employeeId, leaveTypeId) {
    throw new Error("LeaveBalanceRepository.findByEmployeeAndType not implemented");
  }

  /**
   * Atomically subtracts `amount` from availableLeaves, but only if enough is left.
   * @returns {Promise<import("./LeaveBalance").LeaveBalance | null>} null when there was not enough
   */
  async deductAvailable(id, amount) {
    throw new Error("LeaveBalanceRepository.deductAvailable not implemented");
  }

  /** Atomically adds `amount` back to availableLeaves (undoing a deduction). */
  async restoreAvailable(id, amount) {
    throw new Error("LeaveBalanceRepository.restoreAvailable not implemented");
  }

  /** @returns {Promise<boolean>} whether any balance still refers to this leave type */
  async existsForLeaveType(leaveTypeId) {
    throw new Error("LeaveBalanceRepository.existsForLeaveType not implemented");
  }

  /** Deletes every balance of an employee (used when the employee is deleted). */
  async removeForEmployee(employeeId) {
    throw new Error("LeaveBalanceRepository.removeForEmployee not implemented");
  }
}
