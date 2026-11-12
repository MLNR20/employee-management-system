/**
 * Generic repository contract for any Entity. Concrete repositories (and the
 * per-entity contracts that extend this) never expose their storage details.
 *
 * @template {import("./Entity").Entity} T
 */
export class Repository {
  /** @returns {Promise<T[]>} */
  async findAll() {
    throw new Error("Repository.findAll not implemented");
  }

  /**
   * One page of entities.
   * @param {{page: number, pageSize: number, search?: string, sortBy?: string, sortDir?: 1 | -1}} query
   * @returns {Promise<{items: T[], total: number}>} total counts every match, not just this page
   */
  async findPage(query) {
    throw new Error("Repository.findPage not implemented");
  }

  /** @returns {Promise<{total: number, active: number, inactive: number}>} */
  async summary() {
    throw new Error("Repository.summary not implemented");
  }

  /** @returns {Promise<T | null>} */
  async findById(id) {
    throw new Error("Repository.findById not implemented");
  }

  /** @returns {Promise<T>} */
  async create(data) {
    throw new Error("Repository.create not implemented");
  }

  /** @returns {Promise<T | null>} null when the entity does not exist */
  async update(id, data) {
    throw new Error("Repository.update not implemented");
  }

  /** @returns {Promise<boolean>} whether something was deleted */
  async remove(id) {
    throw new Error("Repository.remove not implemented");
  }
}
