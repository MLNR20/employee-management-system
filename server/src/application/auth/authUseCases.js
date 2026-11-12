import {
  InvalidCredentialsError,
  InvalidTokenError,
  ValidationError,
} from "../../domain/errors.js";
import { toPublicAdministrator } from "../../domain/administrator/Administrator.js";

const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;

/**
 * @param {Object} deps
 * @param {import("../../domain/administrator/AdministratorRepository").AdministratorRepository} deps.administratorRepository
 * @param {import("../ports/PasswordHasher").PasswordHasher} deps.passwordHasher
 * @param {import("../ports/TokenService").TokenService} deps.tokenService
 * @param {{username?: string, password?: string, first_name?: string, last_name?: string, email?: string}} [deps.seedAdministrator]
 */
export const createAuthUseCases = ({
  administratorRepository,
  passwordHasher,
  tokenService,
  seedAdministrator = {},
}) => ({
  async login({ username, password } = {}) {
    // Type checks stop objects like {"$ne": null} from reaching the query.
    if (!isNonEmptyString(username) || !isNonEmptyString(password)) {
      throw new InvalidCredentialsError();
    }

    const admin = await administratorRepository.findByUsername(username);
    // Deactivated administrators cannot sign in.
    const matches =
      admin && admin.isActive && (await passwordHasher.compare(password, admin.passwordHash));

    // Same error for unknown user and wrong password: no account enumeration.
    if (!matches) throw new InvalidCredentialsError();

    const refreshToken = tokenService.signRefreshToken(admin);
    await administratorRepository.setRefreshTokenHash(
      admin.id,
      tokenService.fingerprint(refreshToken)
    );

    return { accessToken: tokenService.signAccessToken(admin), refreshToken };
  },

  /** Exchanges a refresh token for a new pair; the old refresh token stops working. */
  async refreshSession({ refreshToken } = {}) {
    if (!isNonEmptyString(refreshToken)) {
      throw new InvalidTokenError("Refresh token missing");
    }

    const payload = tokenService.verifyRefreshToken(refreshToken);
    const admin = await administratorRepository.findById(payload.id);
    if (!admin) throw new InvalidTokenError("Session is no longer valid");

    const newRefreshToken = tokenService.signRefreshToken(admin);
    const rotated = await administratorRepository.rotateRefreshTokenHash(
      admin.id,
      tokenService.fingerprint(refreshToken),
      tokenService.fingerprint(newRefreshToken)
    );

    if (!rotated) {
      // A token that is no longer current was presented: assume it leaked and end the session.
      await administratorRepository.setRefreshTokenHash(admin.id, null);
      throw new InvalidTokenError("Refresh token already used");
    }

    return {
      accessToken: tokenService.signAccessToken(admin),
      refreshToken: newRefreshToken,
    };
  },

  /** Revokes the session. Never fails: an unusable token has nothing left to revoke. */
  async logout({ refreshToken } = {}) {
    if (!isNonEmptyString(refreshToken)) return;

    try {
      const payload = tokenService.verifyRefreshToken(refreshToken);
      await administratorRepository.setRefreshTokenHash(payload.id, null);
    } catch (error) {
      // Invalid or expired token: nothing to revoke.
    }
  },

  async register(input = {}) {
    const { username, password, first_name, last_name, email } = input;

    if (![username, password, first_name, last_name, email].every(isNonEmptyString)) {
      throw new ValidationError(
        "Send all required fields: username, password, first name, last name, email"
      );
    }

    const admin = await administratorRepository.create({
      username,
      first_name,
      last_name,
      email,
      passwordHash: await passwordHasher.hash(password),
    });

    return toPublicAdministrator(admin);
  },

  /** Creates the configured seed administrator on a fresh install. */
  async ensureAdministratorsExist() {
    if ((await administratorRepository.count()) > 0) return { created: false };

    const { username, password, first_name, last_name, email } = seedAdministrator;
    if (![username, password, first_name, last_name, email].every(isNonEmptyString)) {
      return { created: false };
    }

    await administratorRepository.create({
      username,
      first_name,
      last_name,
      email,
      passwordHash: await passwordHasher.hash(password),
    });
    return { created: true };
  },

  /** Validates an access token and returns who it belongs to. */
  authenticate(accessToken) {
    return tokenService.verifyAccessToken(accessToken);
  },
});
