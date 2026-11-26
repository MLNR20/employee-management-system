import { ValidationError } from "./errors.js";

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt ignores everything past 72 bytes

/**
 * Throws ValidationError unless a password someone is choosing is text of a sensible length.
 * @param {unknown} password
 * @param {string} [label] how the message names it
 */
export function assertValidPassword(password, label = "Password") {
  if (
    typeof password !== "string" ||
    password.length < PASSWORD_MIN ||
    Buffer.byteLength(password) > PASSWORD_MAX
  ) {
    throw new ValidationError(`${label} must be ${PASSWORD_MIN} to ${PASSWORD_MAX} characters`);
  }
}

/**
 * Checks a person's request to change their own password: both are sent, and the new one is
 * acceptable and different. Whether the current one is right is for the caller to check.
 */
export function assertValidPasswordChange({ currentPassword, newPassword } = {}) {
  if (typeof currentPassword !== "string" || currentPassword === "") {
    throw new ValidationError("Send your current password");
  }
  assertValidPassword(newPassword, "The new password");
  if (newPassword === currentPassword) {
    throw new ValidationError("The new password must be different from the current one");
  }
}
