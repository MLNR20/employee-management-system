import { Entity } from "../Entity.js";

/**
 * A message shown to an administrator in the navbar bell. `dateCreated` (from Entity) is when it was
 * raised; `isRead` flips to true once it has been seen.
 */
export class Notification extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.title short headline
   * @param {string} [props.subtitle] one line under the title
   * @param {string} [props.body] the full message
   * @param {boolean} [props.isRead] defaults to false
   * @param {string|null} [props.recipientEmployeeId] the employee it is for (their portal bell); null means
   *   the shared administrator bell
   */
  constructor({ title, subtitle = "", body = "", isRead = false, recipientEmployeeId = null, ...base } = {}) {
    super(base);
    this.title = title;
    this.subtitle = subtitle;
    this.body = body;
    this.isRead = isRead;
    this.recipientEmployeeId = recipientEmployeeId;
  }
}
