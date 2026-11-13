import { Repository } from "../Repository.js";

/**
 * Inventory item persistence contract. Everything is inherited from the generic Repository.
 * @extends {Repository<import("./Item").Item>}
 */
export class ItemRepository extends Repository {
  /** @returns {Promise<boolean>} whether any item is currently held by this employee */
  async existsForEmployee(employeeId) {
    throw new Error("ItemRepository.existsForEmployee not implemented");
  }

  /** @returns {Promise<import("./Item").Item[]>} active items nobody holds, so they can be borrowed */
  async findAvailable() {
    throw new Error("ItemRepository.findAvailable not implemented");
  }

  /** @returns {Promise<import("./Item").Item[]>} the items this employee currently holds */
  async findHeldBy(employeeId) {
    throw new Error("ItemRepository.findHeldBy not implemented");
  }

  /**
   * Atomically hands an available item to an employee, only if it is still available. This is
   * what stops two employees borrowing the same item at once.
   * @returns {Promise<import("./Item").Item | null>} null when it was not available
   */
  async claim(itemId, employeeId) {
    throw new Error("ItemRepository.claim not implemented");
  }

  /**
   * Atomically takes an item back, only if this employee is the one holding it.
   * @returns {Promise<import("./Item").Item | null>} null when they were not holding it
   */
  async release(itemId, employeeId) {
    throw new Error("ItemRepository.release not implemented");
  }
}
