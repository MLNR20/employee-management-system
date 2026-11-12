import { Repository } from "../Repository.js";

/**
 * Audit log persistence contract. Append-only: implementations must refuse
 * update and remove, so a recorded action can never be changed or erased.
 * @extends {Repository<import("./AuditLog").AuditLog>}
 */
export class AuditLogRepository extends Repository {}
