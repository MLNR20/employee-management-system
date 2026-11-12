import { Entity } from "../Entity.js";

/** Where an inventory item stands. Only an item "in_use" is held by an employee. */
export const ItemStatus = Object.freeze({
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
});

/** A piece of company equipment, identified by its serial number, e.g. a laptop or a phone. */
export class Item extends Entity {
  /**
   * @param {Object} props
   * @param {string} props.name
   * @param {string} props.serialNumber unique across all items
   * @param {string} [props.category] e.g. "Laptop", "Monitor"
   * @param {string} [props.status] one of ItemStatus (default "available")
   * @param {string} [props.location] where it is kept
   * @param {string} [props.assignedEmployeeId] the employee holding it, when in use
   * @param {Date} [props.purchaseDate]
   * @param {number} [props.purchaseCost]
   * @param {string} [props.notes]
   */
  constructor({
    name,
    serialNumber,
    category,
    status = ItemStatus.AVAILABLE,
    location,
    assignedEmployeeId,
    purchaseDate,
    purchaseCost,
    notes,
    ...base
  } = {}) {
    super(base);
    this.name = name;
    this.serialNumber = serialNumber;
    this.category = category;
    this.status = status;
    this.location = location;
    this.assignedEmployeeId = assignedEmployeeId;
    this.purchaseDate = purchaseDate;
    this.purchaseCost = purchaseCost;
    this.notes = notes;
  }
}
