import { toPublicAdministrator } from "../../domain/administrator/Administrator.js";
import { NotFoundError, ValidationError } from "../../domain/errors.js";
import { assertValidPassword } from "../../domain/passwordRules.js";

/**
 * The administrator accounts: listing them (e.g. to pick one when assigning a role) and resetting a
 * forgotten password. The HTTP layer decides who may do the latter.
 *
 * @param {Object} deps
 * @param {import("../../domain/administrator/AdministratorRepository").AdministratorRepository} deps.administratorRepository
 * @param {import("../ports/PasswordHasher").PasswordHasher} [deps.passwordHasher] needed to reset passwords
 */
export const createAdministratorUseCases = ({ administratorRepository, passwordHasher }) => ({
  async listAdministrators() {
    const administrators = await administratorRepository.findAll();
    return administrators.map(toPublicAdministrator);
  },

  /**
   * Gives another administrator a new password and ends their sessions. Nobody resets their own this
   * way: changing it needs the current one, so a session left open cannot be used to take the account.
   */
  async resetPassword(id, newPassword, requesterId) {
    if (id === requesterId) {
      throw new ValidationError("To change your own password, use Change password: it asks for your current one");
    }
    assertValidPassword(newPassword, "The new password");
    if (!(await administratorRepository.findById(id))) throw new NotFoundError("Administrator not found");
    await administratorRepository.setPasswordHash(id, await passwordHasher.hash(newPassword));
  },
});
