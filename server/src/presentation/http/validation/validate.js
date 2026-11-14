import { validationResult } from "express-validator";
import { ValidationError } from "../../../domain/errors.js";

/**
 * Runs express-validator chains and, when any failed, answers 400 with the first message
 * (through the same ValidationError path as every other input error). Sanitizers such as
 * trim() have already changed req.body by the time the next handler runs.
 */
export const validate = (...chains) => async (req, res, next) => {
  for (const chain of chains) await chain.run(req);

  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  next(new ValidationError(errors.array({ onlyFirstError: true })[0].msg));
};
