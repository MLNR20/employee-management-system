import { Entity, baseProps } from "../Entity";

/** One recorded action: who did what to which record. Read-only: logs are never edited or deleted. */
export class AuditLog extends Entity {
  constructor({ actorId, actorName, action, resource, resourceId, method, path, statusCode, ip, ...base } = {}) {
    super(base);
    this.actorId = actorId;
    this.actorName = actorName;
    this.action = action;
    this.resource = resource;
    this.resourceId = resourceId;
    this.method = method;
    this.path = path;
    this.statusCode = statusCode;
    this.ip = ip;
  }

  static fromApi(raw = {}) {
    return new AuditLog({
      ...baseProps(raw),
      actorId: raw.actorId,
      actorName: raw.actorName,
      action: raw.action,
      resource: raw.resource,
      resourceId: raw.resourceId,
      method: raw.method,
      path: raw.path,
      statusCode: raw.statusCode,
      ip: raw.ip,
    });
  }
}
