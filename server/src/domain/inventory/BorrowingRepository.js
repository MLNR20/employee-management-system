import { Repository } from "../Repository.js";

/** @extends {Repository<import("./Borrowing").Borrowing>} */
export class BorrowingRepository extends Repository {
  /** @returns {Promise<import("./Borrowing").Borrowing[]>} newest first */
  async findByEmployeeId(employeeId) {
    throw new Error("BorrowingRepository.findByEmployeeId not implemented");
  }

  /**
   * Closes the open borrowing of this item by this employee.
   * @returns {Promise<import("./Borrowing").Borrowing | null>} null when there was none open
   */
  async markReturned(itemId, employeeId) {
    throw new Error("BorrowingRepository.markReturned not implemented");
  }
}
