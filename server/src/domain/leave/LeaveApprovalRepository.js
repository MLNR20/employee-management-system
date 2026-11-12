import { Repository } from "../Repository.js";

/** @extends {Repository<import("./LeaveApproval").LeaveApproval>} */
export class LeaveApprovalRepository extends Repository {
  /** @returns {Promise<import("./LeaveApproval").LeaveApproval[]>} */
  async findByLeaveRequestId(leaveRequestId) {
    throw new Error("LeaveApprovalRepository.findByLeaveRequestId not implemented");
  }
}
