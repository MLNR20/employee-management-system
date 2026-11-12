import { Entity, baseProps } from "../Entity";

export const ItemStatus = Object.freeze({
  AVAILABLE: "available",
  IN_USE: "in_use",
  MAINTENANCE: "maintenance",
  RETIRED: "retired",
});

export const itemStatusLabels = {
  [ItemStatus.AVAILABLE]: "Available",
  [ItemStatus.IN_USE]: "In use",
  [ItemStatus.MAINTENANCE]: "Maintenance",
  [ItemStatus.RETIRED]: "Retired",
};

// A purchase date is a calendar day: keep "YYYY-MM-DD" so no time zone can shift it, and a date input can edit it.
const toDay = (value) => (value ? String(value).slice(0, 10) : undefined);

/** A piece of company equipment, identified by its serial number. */
export class Item extends Entity {
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

  static fromApi(raw = {}) {
    return new Item({
      ...baseProps(raw),
      name: raw.name,
      serialNumber: raw.serialNumber,
      category: raw.category,
      status: raw.status,
      location: raw.location,
      assignedEmployeeId: raw.assignedEmployeeId,
      purchaseDate: toDay(raw.purchaseDate),
      purchaseCost: raw.purchaseCost,
      notes: raw.notes,
    });
  }
}
