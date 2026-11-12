/**
 * Generic repository contract for any Entity. Per-entity contracts extend it;
 * infrastructure provides the implementation (HTTP today).
 */
export class Repository {
  /** @returns {Promise<import("./Entity").Entity[]>} */
  async getAll() {
    throw new Error("Repository.getAll not implemented");
  }

  /**
   * One page of entities, with search and sort done by the server.
   * @param {{page: number, pageSize: number, search?: string, sortBy?: string, sortDir?: "asc" | "desc"}} params
   * @returns {Promise<{items: import("./Entity").Entity[], total: number, page: number, pageSize: number, totalPages: number}>}
   */
  async getPage(params) {
    throw new Error("Repository.getPage not implemented");
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
