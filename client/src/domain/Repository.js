/**
 * Generic repository contract for any Entity. Per-entity contracts extend it;
 * infrastructure provides the implementation (HTTP today).
 */
export class Repository {
  /** @returns {Promise<import("./Entity").Entity[]>} */
  async getAll() {
    throw new Error("Repository.getAll not implemented");
  }

  /** @returns {Promise<import("./Entity").Entity>} */
  async getById(id) {
    throw new Error("Repository.getById not implemented");
  }

  async create(data) {
    throw new Error("Repository.create not implemented");
  }

  async update(id, data) {
    throw new Error("Repository.update not implemented");
  }

  async remove(id) {
    throw new Error("Repository.remove not implemented");
  }
}
