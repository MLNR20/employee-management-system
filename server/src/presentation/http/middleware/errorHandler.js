import {
  DuplicateAdministratorError,
  DuplicateDepartmentError,
  DuplicateEmployeeError,
  DuplicateItemError,
  DuplicateShiftError,
  DuplicateDocumentRequirementError,
  DocumentRequirementInUseError,
  DuplicateEmployeeDocumentError,
  DuplicateLeaveBalanceError,
  DuplicateLeaveTypeError,
  DuplicateRoleAssignmentError,
  DuplicateRoleError,
  EmployeeInUseError,
  ForbiddenError,
  InvalidCredentialsError,
  InvalidStateError,
  LeaveTypeInUseError,
  RoleInUseError,
  InvalidTokenError,
  NotFoundError,
  TokenExpiredError,
  ValidationError,
} from "../../../domain/errors.js";

// Single place where domain errors become HTTP responses. Order matters:
// TokenExpiredError is a subclass of InvalidTokenError, so it comes first.
const MAPPINGS = [
  [TokenExpiredError, () => ({ status: 401, body: { code: "TOKEN_EXPIRED" } })],
  [InvalidTokenError, () => ({ status: 401, body: { code: "TOKEN_INVALID" } })],
  [ForbiddenError, () => ({ status: 403, body: {} })],
  [ValidationError, () => ({ status: 400, body: {} })],
  [InvalidCredentialsError, () => ({ status: 400, body: {} })],
  // The client recognises a duplicate administrator by this code.
  [DuplicateAdministratorError, () => ({ status: 400, body: { code: 11000 } })],
  [DuplicateEmployeeError, () => ({ status: 409, body: {} })],
  [DuplicateDepartmentError, () => ({ status: 409, body: {} })],
  [DuplicateRoleError, () => ({ status: 409, body: {} })],
  [DuplicateRoleAssignmentError, () => ({ status: 409, body: {} })],
  [DuplicateLeaveTypeError, () => ({ status: 409, body: {} })],
  [DuplicateItemError, () => ({ status: 409, body: {} })],
  [DuplicateShiftError, () => ({ status: 409, body: {} })],
  [DuplicateDocumentRequirementError, () => ({ status: 409, body: {} })],
  [DocumentRequirementInUseError, () => ({ status: 409, body: {} })],
  [DuplicateEmployeeDocumentError, () => ({ status: 409, body: {} })],
  [RoleInUseError, () => ({ status: 409, body: {} })],
  [DuplicateLeaveBalanceError, () => ({ status: 409, body: {} })],
  [LeaveTypeInUseError, () => ({ status: 409, body: {} })],
  [EmployeeInUseError, () => ({ status: 409, body: {} })],
  [InvalidStateError, () => ({ status: 409, body: {} })],
  [NotFoundError, () => ({ status: 404, body: {} })],
];

// Express identifies error middleware by its four parameters.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  const match = MAPPINGS.find(([ErrorClass]) => error instanceof ErrorClass);

  if (match) {
    const { status, body } = match[1]();
    return res.status(status).json({ message: error.message, ...body });
  }

  // Malformed JSON bodies and similar errors raised by Express itself.
  if (error.status && error.status < 500) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Server error" });
};
