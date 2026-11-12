import { InvalidTokenError } from "../../../domain/errors.js";

/** Requires a valid access token and sets req.user. Failures go to the error handler as 401s. */
export const createAuthMiddleware = (authUseCases) => (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) return next(new InvalidTokenError("Authorization header missing"));

  const token = authHeader.split(" ")[1];
  if (!token) return next(new InvalidTokenError("Token missing"));

  try {
    req.user = authUseCases.authenticate(token);
    next();
  } catch (error) {
    next(error);
  }
};
