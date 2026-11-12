/**
 * Contract for administrator persistence. Implementations translate their own
 * storage errors into domain errors (e.g. DuplicateAdministratorError).
 */
export class AdministratorRepository {
  /** @returns {Promise<import("./Administrator").Administrator | null>} */
  async findById(id) {
    throw new Error("AdministratorRepository.findById not implemented");
  }

  /** @returns {Promise<import("./Administrator").Administrator | null>} */
  async findByUsername(username) {
    throw new Error("AdministratorRepository.findByUsername not implemented");
  }

  /** @returns {Promise<import("./Administrator").Administrator[]>} */
  async findAll() {
    throw new Error("AdministratorRepository.findAll not implemented");
  }

  /** @returns {Promise<number>} */
  async count() {
    throw new Error("AdministratorRepository.count not implemented");
  }

  /** @param {Omit<import("./Administrator").Administrator, "id">} data */
  async create(data) {
    throw new Error("AdministratorRepository.create not implemented");
  }

  /** Stores (or clears, with null) the fingerprint of the one valid refresh token. */
  async setRefreshTokenHash(id, hash) {
    throw new Error("AdministratorRepository.setRefreshTokenHash not implemented");
  }

  /**
   * Atomically replaces the stored fingerprint, but only if it still equals
   * `expectedHash`. Returns false when it does not (token already rotated or revoked).
   * @returns {Promise<boolean>}
   */
  async rotateRefreshTokenHash(id, expectedHash, newHash) {
    throw new Error("AdministratorRepository.rotateRefreshTokenHash not implemented");
  }
}
