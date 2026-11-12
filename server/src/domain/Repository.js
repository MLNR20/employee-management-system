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
