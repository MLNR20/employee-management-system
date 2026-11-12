// Domain errors. Use cases throw these; the HTTP layer maps them to status codes
// in one place (presentation/http/middleware/errorHandler.js).

export class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends DomainError {}

export class NotFoundError extends DomainError {
  constructor(message = "Not found") {
    super(message);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor(message = "Incorrect username or password.") {
    super(message);
  }
}

export class DuplicateAdministratorError extends DomainError {
  constructor(message = "Username or email already exists") {
    super(message);
  }
}

export class DuplicateEmployeeError extends DomainError {
  constructor(message = "An employee with this email already exists") {
    super(message);
  }
}

export class DuplicateDepartmentError extends DomainError {
  constructor(message = "A department with this name or code already exists") {
    super(message);
  }
}

export class DuplicateRoleError extends DomainError {
  constructor(message = "A role with this name already exists") {
    super(message);
  }
}

export class DuplicateRoleAssignmentError extends DomainError {
  constructor(message = "This administrator already has this role") {
    super(message);
  }
}

export class DuplicateLeaveTypeError extends DomainError {
  constructor(message = "A leave type with this name already exists") {
    super(message);
  }
}

/** The action does not fit the current state, e.g. deciding a request that is already decided. */
export class InvalidStateError extends DomainError {
  constructor(message = "This action is not allowed in the current state") {
    super(message);
  }
}

export class DuplicateLeaveBalanceError extends DomainError {
  constructor(message = "This employee already has a balance for this leave type") {
    super(message);
  }
}

export class LeaveTypeInUseError extends DomainError {
  constructor(message = "Employees have leave balances or requests of this type. Mark it inactive instead.") {
    super(message);
  }
}

export class EmployeeInUseError extends DomainError {
  constructor(message = "This employee has leave history. Mark them inactive instead of deleting.") {
    super(message);
  }
}

export class RoleInUseError extends DomainError {
  constructor(message = "This role is assigned to administrators. Remove the assignments first.") {
    super(message);
  }
}

export class InvalidTokenError extends DomainError {
  constructor(message = "Invalid token") {
    super(message);
  }
}

export class TokenExpiredError extends InvalidTokenError {
  constructor(message = "Token expired") {
    super(message);
  }
}
