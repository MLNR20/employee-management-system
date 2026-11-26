import { ForbiddenError } from "../../../domain/errors.js";

/**
 * Lets a request through only when the signed-in administrator holds a role granting one of `permissions`.
 * Must run after the auth middleware, which sets req.user from the access token.
 *
 * The decision comes from the `permissions` claim in the token, so no lookup is needed. That claim is
 * fixed when the token is issued: taking a permission away takes effect when the administrator's token
 * is next renewed. A token without the claim (issued before roles were added to tokens) is checked
 * against the stored roles instead. Denials go to the error handler as 403s.
 */
export const createRequirePermission = (authorizationUseCases) => (...permissions) => async (req, res, next) => {
  try {
    const claimed = req.user?.permissions;
    let allowed = false;
    if (Array.isArray(claimed)) {
      allowed = permissions.some((permission) => claimed.includes(permission));
    } else {
      for (const permission of permissions) {
        allowed = await authorizationUseCases.hasPermission(req.user?.id, permission);
        if (allowed) break;
      }
    }

    if (!allowed) throw new ForbiddenError("Your roles do not include permission to do this.");
    next();
  } catch (error) {
    next(error);
  }
};
