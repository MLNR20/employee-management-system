/**
 * Contract for authentication and session handling.
 * Implementations throw the errors from domain/errors.js.
 */
export class AuthRepository {
  /** Signs in and stores the session. */
  async login({ username, password }) {
    throw new Error("AuthRepository.login not implemented");
  }

  async register(administrator) {
    throw new Error("AuthRepository.register not implemented");
  }

  /** Revokes the session on the server (best effort) and clears it locally. */
  async logout() {
    throw new Error("AuthRepository.logout not implemented");
  }

  /** Ensures the seed administrator exists on a fresh install. */
  async ensureAdministratorsExist() {
    throw new Error("AuthRepository.ensureAdministratorsExist not implemented");
  }

  /** @returns {Promise<import("./Administrator").Administrator>} */
  async getCurrentAdministrator() {
    throw new Error("AuthRepository.getCurrentAdministrator not implemented");
  }

  /** @returns {boolean} whether a session is stored locally */
  isAuthenticated() {
    throw new Error("AuthRepository.isAuthenticated not implemented");
  }
}
