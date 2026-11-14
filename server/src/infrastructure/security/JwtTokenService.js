import crypto from "crypto";
import jwt from "jsonwebtoken";
import { TokenService } from "../../application/ports/TokenService.js";
import { InvalidTokenError, TokenExpiredError } from "../../domain/errors.js";

export class JwtTokenService extends TokenService {
  constructor({ accessSecret, refreshSecret, accessTtl, refreshTtl }) {
    super();
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
    this.accessTtl = accessTtl;
    this.refreshTtl = refreshTtl;
  }

  /**
   * `access` carries what the administrator may do, resolved when the token is issued:
   * the names of their active roles and the union of those roles' permissions ("<module>:<action>").
   * Changes to roles reach a signed-in administrator when the token is next renewed.
   */
  signAccessToken(admin, access = {}) {
    return jwt.sign(
      {
        id: admin.id,
        username: admin.username,
        first_name: admin.first_name,
        last_name: admin.last_name,
        roles: access.roles ?? [],
        permissions: access.permissions ?? [],
      },
      this.accessSecret,
      { expiresIn: this.accessTtl }
    );
  }

  signRefreshToken(admin) {
    // jti makes every refresh token unique, even two signed in the same second;
    // without it, rotation could hand back the very token it is replacing.
    return jwt.sign({ id: admin.id, jti: crypto.randomUUID() }, this.refreshSecret, {
      expiresIn: this.refreshTtl,
    });
  }

  verifyAccessToken(token) {
    return this.#verify(token, this.accessSecret);
  }

  verifyRefreshToken(token) {
    return this.#verify(token, this.refreshSecret);
  }

  fingerprint(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  #verify(token, secret) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      if (error.name === "TokenExpiredError") throw new TokenExpiredError();
      throw new InvalidTokenError();
    }
  }
}
