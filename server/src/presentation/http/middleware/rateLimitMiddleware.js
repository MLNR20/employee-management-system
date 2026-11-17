import { rateLimit } from "express-rate-limit";

const tooManyRequests = (message) => (req, res) => {
  res.status(429).json({ message });
};

const limiter = ({ windowMs, limit, message, ...options }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7", // RateLimit and Retry-After headers so clients know when to retry
    legacyHeaders: false,
    handler: tooManyRequests(message),
    ...options,
  });

/**
 * Limits for the whole API, keyed by client IP. Counts live in this process's memory, which is right for
 * a single server (Render's free plan); with several instances move the store to Redis or similar.
 * Mount it after the /health route so uptime monitors and Render's own probe are never throttled.
 *
 * @param {{ windowMs: number, max: number }} options
 */
export const createApiRateLimiter = ({ windowMs, max }) =>
  limiter({ windowMs, limit: max, message: "Too many requests. Please try again later." });

/**
 * Stricter limit for the endpoints that guess-and-check attacks go through: sign-in, registration and token
 * refresh. Successful requests are not counted, so a legitimate user who signs in and out is never locked out;
 * only repeated failures (wrong password, bad token) use up the allowance.
 *
 * @param {{ windowMs: number, max: number }} options
 */
export const createAuthRateLimiter = ({ windowMs, max }) =>
  limiter({
    windowMs,
    limit: max,
    message: "Too many attempts. Please wait a while before trying again.",
    skipSuccessfulRequests: true,
  });
