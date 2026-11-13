import { InvalidCredentialsError } from "../../domain/errors.js";

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";

/**
 * Signing in to the employee portal. Employees use their email and the portal password an
 * administrator set. Their tokens are signed with their own secret, so an employee token can
 * never open an administrator route (or the other way round).
 *
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../ports/PasswordHasher").PasswordHasher} deps.passwordHasher
 * @param {import("../ports/TokenService").TokenService} deps.tokenService a service using the employee secret
 */
export const createEmployeeAuthUseCases = ({ employeeRepository, passwordHasher, tokenService }) => ({
  async login({ email, password } = {}) {
    // Type checks stop objects like {"$ne": null} from reaching the query.
    if (!isNonEmptyString(email) || !isNonEmptyString(password)) throw new InvalidCredentialsError();

    const employee = await employeeRepository.findCredentialsByEmail(email);
    // No portal password, or an inactive employee, cannot sign in.
    const matches =
      employee &&
      employee.isActive &&
      employee.passwordHash &&
      (await passwordHasher.compare(password, employee.passwordHash));

    // Same error for unknown email, no password set and wrong password: no account enumeration.
    if (!matches) throw new InvalidCredentialsError("Incorrect email or password.");

    return {
      accessToken: tokenService.signAccessToken({
        id: employee.id,
        username: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
      }),
    };
  },

  /** Verifies an employee access token; throws the same errors as administrator tokens. */
  authenticate(accessToken) {
    return tokenService.verifyAccessToken(accessToken);
  },
});
