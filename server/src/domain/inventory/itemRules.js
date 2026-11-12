import { ValidationError } from "../errors.js";
import { isMissing, pickFields } from "../pickFields.js";
import { ItemStatus } from "./Item.js";

const REQUIRED = ["name", "serialNumber"];
const ALLOWED = [
  ...REQUIRED,
  "category",
  "status",
  "location",
  "assignedEmployeeId",
  "purchaseDate",
  "purchaseCost",
  "notes",
  "isActive",
];
const STATUSES = Object.values(ItemStatus);

/**
 * Throws ValidationError unless the item is complete and consistent:
 * name and serial number are present, status is known, cost is not negative,
 * the purchase date is a real date, and only an item in use has an assignee (and must have one).
 */
export function assertValidItem(input) {
  if (REQUIRED.some((field) => isMissing(input[field]))) {
    throw new ValidationError("Send all required fields: name, serialNumber");
  }

  const status = isMissing(input.status) ? ItemStatus.AVAILABLE : input.status;
  if (!STATUSES.includes(status)) {
    throw new ValidationError(`status must be one of: ${STATUSES.join(", ")}`);
  }

  if (!isMissing(input.purchaseCost)) {
    const cost = Number(input.purchaseCost);
    if (Number.isNaN(cost) || cost < 0) throw new ValidationError("purchaseCost must be a number, 0 or more");
  }

  if (!isMissing(input.purchaseDate) && Number.isNaN(new Date(input.purchaseDate).getTime())) {
    throw new ValidationError("purchaseDate must be a valid date");
  }

  const assigned = !isMissing(input.assignedEmployeeId);
  if (status === ItemStatus.IN_USE && !assigned) {
    throw new ValidationError("An item in use must be assigned to an employee");
  }
  if (status !== ItemStatus.IN_USE && assigned) {
    throw new ValidationError("Only an item in use can be assigned to an employee");
  }
}

/** Whitelists the writable fields; blank optional values are stored as empty (null) rather than "". */
export const pickItemFields = (input) => {
  const picked = pickFields(input, ALLOWED);
  for (const field of ["assignedEmployeeId", "purchaseDate", "purchaseCost"]) {
    if (field in picked && isMissing(picked[field])) picked[field] = null;
  }
  return picked;
};
