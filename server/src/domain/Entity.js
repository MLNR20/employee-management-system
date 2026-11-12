/**
 * Base class for every persisted domain entity: identity, audit dates and an
 * active flag. Employee, Department and Administrator inherit from it.
 */
export class Entity {
  /**
   * @param {Object} [props]
   * @param {string} [props.id]
   * @param {Date} [props.dateCreated]
   * @param {Date} [props.dateUpdated]
   * @param {boolean} [props.isActive] defaults to true
   */
  constructor({ id, dateCreated, dateUpdated, isActive = true } = {}) {
    this.id = id;
    this.dateCreated = dateCreated;
    this.dateUpdated = dateUpdated;
    this.isActive = isActive;
  }
}
