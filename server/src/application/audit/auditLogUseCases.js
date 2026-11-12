import { normalizePageQuery, toPage } from "../../domain/pagination.js";
import { NotFoundError } from "../../domain/errors.js";

const FIELDS = ["actorId", "actorName", "action", "resource", "resourceId", "method", "path", "statusCode", "ip"];

/**
 * Recording and reading the audit trail. There is deliberately no update or delete:
 * the log is append-only, and the HTTP API only reads it.
 *
 * @param {{auditLogRepository: import("../../domain/audit/AuditLogRepository").AuditLogRepository}} deps
 */
export const createAuditLogUseCases = ({ auditLogRepository }) => ({
  /** Appends one entry. Only the known fields are kept. */
  record(entry = {}) {
    const data = Object.fromEntries(FIELDS.filter((f) => entry[f] !== undefined).map((f) => [f, entry[f]]));
    return auditLogRepository.create(data);
  },

  /** The newest entries, for callers that do not ask for a page. */
  async listAuditLogs() {
    const { items } = await auditLogRepository.findPage({ page: 1, pageSize: 100, sortDir: -1 });
    return items;
  },

  async listAuditLogsPage(query) {
    const request = normalizePageQuery(query);
    return toPage(await auditLogRepository.findPage(request), request);
  },

  async getAuditLog(id) {
    const entry = await auditLogRepository.findById(id);
    if (!entry) throw new NotFoundError("Audit log not found");
    return entry;
  },
});
