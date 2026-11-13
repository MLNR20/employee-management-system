import { Entity } from "../Entity.js";

/**
 * One time an employee borrowed a piece of equipment. It stays open (no `returnedAt`) until the
 * employee gives the item back. Whether an item can be borrowed is decided by the item itself
 * (its status), not by this record, which is the history.
 */
export class Borrowing extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.itemId
   * @param {string} props.employeeId
   * @param {Date} [props.borrowedAt]
   * @param {Date | null} [props.returnedAt] null while the item is still out
   */
  constructor({ itemId, employeeId, borrowedAt, returnedAt = null, ...base } = {}) {
    super(base);
    this.itemId = itemId;
    this.employeeId = employeeId;
    this.borrowedAt = borrowedAt;
    this.returnedAt = returnedAt;
  }
}
