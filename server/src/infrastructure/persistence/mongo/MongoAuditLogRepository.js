import { MongoRepository } from "./MongoRepository.js";
import { AuditLog } from "../../../domain/audit/AuditLog.js";
import { AuditLogModel } from "./models/auditLogModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toAuditLog = (doc) =>
  new AuditLog({
    ...toBaseProps(doc),
    actorId: doc.actorId,
    actorName: doc.actorName,
    action: doc.action,
    resource: doc.resource,
    resourceId: doc.resourceId,
    method: doc.method,
    path: doc.path,
    statusCode: doc.statusCode,
    ip: doc.ip,
  });

/** Append-only: entries can be created and read, never changed or removed. */
export class MongoAuditLogRepository extends MongoRepository {
  constructor() {
    super({
      model: AuditLogModel,
      toEntity: toAuditLog,
      searchFields: ["actorName", "action", "resource", "resourceId", "path"],
    });
  }

  async update() {
    throw new Error("Audit logs are append-only and cannot be updated");
  }

  async remove() {
    throw new Error("Audit logs are append-only and cannot be removed");
  }
}
