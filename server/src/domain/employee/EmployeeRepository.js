import { Repository } from "../Repository.js";

/**
 * Employee persistence contract. Everything is inherited from the generic
 * Repository; add employee-specific queries here (e.g. findByDepartment).
 * @extends {Repository<import("./Employee").Employee>}
 */
export class EmployeeRepository extends Repository {
  /**
   * Stores the hash of the password an employee signs in to the employee portal with.
   * The hash lives beside the employee but is never part of the Employee entity.
   */
  async setPassword(id, passwordHash) {
    throw new Error("EmployeeRepository.setPassword not implemented");
  }

  /**
   * What a sign-in needs, found by email: { id, email, first_name, last_name, isActive, passwordHash },
   * where passwordHash is empty when the employee has no portal password. Null when there is no such employee.
   */
  async findCredentialsByEmail(email) {
    throw new Error("EmployeeRepository.findCredentialsByEmail not implemented");
  }
}
