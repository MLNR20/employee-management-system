import { describeRequest } from "../../../domain/audit/auditRules.js";

// The name typed into a sign-in form: an administrator's username or an employee's email.
const typedUsername = (body) => {
  const typed = typeof body?.username === "string" ? body.username : body?.email;
  return typeof typed === "string" ? typed.trim().slice(0, 100) || undefined : undefined;
};

/**
 * Records every audited request once it has finished. It never delays a response and a
 * failure to write the log never fails the request. Request bodies are not stored, so
 * passwords and other submitted data cannot end up in the log.
 */
export const createAuditMiddleware = (auditLogUseCases) => (req, res, next) => {
  res.on("finish", () => {
    const event = describeRequest({ method: req.method, url: req.originalUrl, status: res.statusCode });
    if (!event) return;

    Promise.resolve(
      auditLogUseCases.record({
        ...event,
        statusCode: res.statusCode,
        ip: req.ip,
        actorId: req.user?.id,
        // Sign-in has no session yet, so the name that was typed is the best we have.
        actorName: req.user?.username ?? typedUsername(req.body),
      })
    ).catch((error) => console.error("Could not write audit log:", error.message));
  });
  next();
};
