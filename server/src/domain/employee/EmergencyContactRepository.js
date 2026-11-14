import { Repository } from "../Repository.js";

/** @extends {Repository<import("./EmergencyContact").EmergencyContact>} */
export class EmergencyContactRepository extends Repository {
  /** @returns {Promise<import("./EmergencyContact").EmergencyContact[]>} oldest first */
  async findByEmployeeId(employeeId) {
    throw new Error("EmergencyContactRepository.findByEmployeeId not implemented");
  }

  /** Deletes every emergency contact of an employee (used when the employee is deleted). */
  async removeForEmployee(employeeId) {
    throw new Error("EmergencyContactRepository.removeForEmployee not implemented");
  }
}
