import { ForbiddenError } from "../../../domain/errors.js";

/**
 * Lets a request through only when the signed-in administrator holds a role granting `permission`.
 * Must run after the auth middleware, which sets req.user. Denials go to the error handler as 403s.
 */
export const createRequirePermission = (authorizationUseCases) => (permission) => async (req, res, next) => {
  try {
    if (!(await authorizationUseCases.hasPermission(req.user?.id, permission))) {
      throw new ForbiddenError("Only HR can do this. Your roles do not include that permission.");
    }
    next();
  } catch (error) {
    next(error);
  }
};
