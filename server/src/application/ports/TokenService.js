/**
 * Port: issuing and verifying session tokens.
 * verify* methods throw InvalidTokenError / TokenExpiredError from the domain.
 */
export class TokenService {
  /**
   *  {object} administrator
   * @param {{roles?: string[], permissions?: string[]}} [access] role names and permissions to carry in the token
   */
  signAccessToken(administrator, access) {
    throw new Error("TokenService.signAccessToken not implemented");
  }

  signRefreshToken(administrator) {
    throw new Error("TokenService.signRefreshToken not implemented");
  }

  /** @returns {{id: string, username: string, first_name: string, last_name: string, roles?: string[], permissions?: string[]}} */
  verifyAccessToken(token) {
    throw new Error("TokenService.verifyAccessToken not implemented");
  }

  /** @returns {{id: string}} */
  verifyRefreshToken(token) {
    throw new Error("TokenService.verifyRefreshToken not implemented");
  }

  /** One-way fingerprint, so only a hash of a refresh token is ever stored. */
  fingerprint(token) {
    throw new Error("TokenService.fingerprint not implemented");
  }
}
