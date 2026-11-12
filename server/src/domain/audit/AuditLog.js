import { Entity } from "../Entity.js";

/**
 * One recorded action: who did what to which record, and when (dateCreated).
 * Audit logs are append-only: they are written when something happens and never edited or deleted.
 */
export class AuditLog extends Entity {
  /**
   * @param {Object} props
   * @param {string} [props.actorId] the signed-in administrator; absent for failed or anonymous attempts
   * @param {string} [props.actorName] their username (for a login attempt, the name that was typed)
   * @param {string} props.action e.g. "create", "update", "delete", "approve", "login", "login_failed"
   * @param {string} [props.resource] what was acted on, e.g. "employees"
   * @param {string} [props.resourceId] the record id, when the request named one
   * @param {string} [props.method] HTTP method
   * @param {string} [props.path] request path without the query string
   * @param {number} [props.statusCode] HTTP status the request ended with
   * @param {string} [props.ip]
   */
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
}
