import { Repository } from "../Repository.js";

/** @extends {Repository<import("./LeaveRequest").LeaveRequest>} */
export class LeaveRequestRepository extends Repository {
  /** @returns {Promise<import("./LeaveRequest").LeaveRequest[]>} */
  async findByEmployeeId(employeeId) {
    throw new Error("LeaveRequestRepository.findByEmployeeId not implemented");
  }

  /**
   * Atomically moves a request from one status to another, only if it is still in `from`.
   * This is what stops two approvers (or a double click) from deciding the same request twice.
   * @returns {Promise<import("./LeaveRequest").LeaveRequest | null>} null when it was not in `from`
   */
  async transitionStatus(id, from, to) {
    throw new Error("LeaveRequestRepository.transitionStatus not implemented");
  }

  /** @returns {Promise<boolean>} whether any request refers to this leave type */
  async existsForLeaveType(leaveTypeId) {
    throw new Error("LeaveRequestRepository.existsForLeaveType not implemented");
  }
}
