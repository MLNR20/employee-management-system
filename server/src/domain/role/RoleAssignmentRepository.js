import { Repository } from "../Repository.js";

/** @extends {Repository<import("./RoleAssignment").RoleAssignment>} */
export class RoleAssignmentRepository extends Repository {
  /** @returns {Promise<boolean>} whether any administrator still holds this role */
  async existsForRole(roleId) {
    throw new Error("RoleAssignmentRepository.existsForRole not implemented");
  }

  /** @returns {Promise<import("./RoleAssignment").RoleAssignment[]>} the roles this administrator holds */
  async findByAdministratorId(administratorId) {
    throw new Error("RoleAssignmentRepository.findByAdministratorId not implemented");
  }
}
