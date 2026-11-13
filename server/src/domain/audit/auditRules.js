const OBJECT_ID = /^[0-9a-f]{24}$/i;
const CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DEFAULT_ACTION = { POST: "create", PUT: "update", PATCH: "update", DELETE: "delete" };

/**
 * Decides whether an HTTP request belongs in the audit log and, if so, what to record.
 * Reads are not audited. Changes are, once they succeeded. Sign-in attempts are audited
 * either way, because a failed login is worth seeing. Token refreshes are skipped as noise.
 *
 * @param {{method: string, url: string, status: number}} request
 * @returns {{action: string, resource: string, resourceId?: string, method: string, path: string} | null}
 */
export const describeRequest = ({ method, url, status }) => {
  const verb = String(method).toUpperCase();
  if (!CHANGING_METHODS.has(verb)) return null;

  const path = String(url).split("?")[0];
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const [resource, second, third] = segments;
  const succeeded = status < 400;
  const base = { method: verb, path };

  if (resource === "employee-auth") {
    if (second !== "login") return null;
    return { ...base, resource, action: succeeded ? "login" : "login_failed" };
  }

  if (resource === "admin") {
    if (second === "login") return { ...base, resource, action: succeeded ? "login" : "login_failed" };
    if (!succeeded) return null;
    if (second === "logout") return { ...base, resource, action: "logout" };
    if (second === "register") return { ...base, resource, action: "register" };
    return null; // e.g. /admin/refresh
  }

  if (!succeeded) return null;

  const resourceId = second && OBJECT_ID.test(second) ? second : undefined;
  // /leave-requests/:id/approve names its own action; otherwise the method decides.
  const action = resourceId && third ? third : DEFAULT_ACTION[verb];
  return { ...base, resource, resourceId, action };
};
