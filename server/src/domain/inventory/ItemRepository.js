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
}
