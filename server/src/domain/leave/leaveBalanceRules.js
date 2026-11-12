import { ValidationError } from "../errors.js";
import { isMissing } from "../pickFields.js";

const isAmount = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Both amounts must be numbers of 0 or more (half days are fine) and available cannot exceed max. */
export function assertValidAmounts({ maxLeaves, availableLeaves }) {
  if (!isAmount(maxLeaves)) {
    throw new ValidationError("maxLeaves must be a number of 0 or more");
  }
  if (!isAmount(availableLeaves)) {
    throw new ValidationError("availableLeaves must be a number of 0 or more");
  }
  if (availableLeaves > maxLeaves) {
    throw new ValidationError("availableLeaves cannot exceed maxLeaves");
  }
}

export function assertValidLeaveBalanceReferences(input) {
  const ids = ["employeeId", "leaveTypeId"];
  if (ids.some((field) => isMissing(input[field]) || typeof input[field] !== "string")) {
    throw new ValidationError("Send all required fields: employeeId, leaveTypeId, maxLeaves");
  }
}
