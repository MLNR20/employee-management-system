// Domain errors. Infrastructure translates transport failures (HTTP status codes,
// response bodies) into these, so the UI never has to know about HTTP.

export class InvalidCredentialsError extends Error {
  constructor(message = "Incorrect username or password.") {
    super(message);
    this.name = "InvalidCredentialsError";
  }
}

export class DuplicateAdministratorError extends Error {
  constructor(message = "Username or email address taken.") {
    super(message);
    this.name = "DuplicateAdministratorError";
  }
}

export class SessionExpiredError extends Error {
  constructor(message = "Your session has expired. Please log in again.") {
    super(message);
    this.name = "SessionExpiredError";
  }
}
