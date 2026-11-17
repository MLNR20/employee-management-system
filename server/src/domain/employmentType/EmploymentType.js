import { Entity } from "../Entity.js";

/**
 * How an employee is employed: Regular, Probationary, Contractual, Part-time and so on.
 * A type is never really removed: `deletedAt` marks it deleted (soft delete) so employees who
 * hold it keep their record. A deleted type is also inactive.
 */
export class EmploymentType extends Entity {
  /**
   * @param {Object} [props]
   * @param {Date | null} [props.deletedAt] set when the type was deleted
   */
  constructor({ name, description, deletedAt = null, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.deletedAt = deletedAt;
  }
}
