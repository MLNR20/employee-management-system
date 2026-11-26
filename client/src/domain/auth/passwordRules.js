// The server checks the same rules; these say so before sending.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

/** The error for a password someone is choosing, or undefined when it is acceptable. */
export const passwordError = (password) => {
  const length = new TextEncoder().encode(password ?? "").length; // the server's limit is in bytes
  return (password?.length ?? 0) < PASSWORD_MIN || length > PASSWORD_MAX
    ? `Use ${PASSWORD_MIN} to ${PASSWORD_MAX} characters.`
    : undefined;
};

/** Returns { field: message } for a change-password form; empty when it can be sent. */
export const validatePasswordChange = ({ currentPassword, newPassword, confirmPassword }) => {
  const errors = {};
  if (!currentPassword) errors.currentPassword = "Enter your current password.";

  const problem = passwordError(newPassword);
  if (problem) errors.newPassword = problem;
  else if (newPassword === currentPassword) errors.newPassword = "Choose a password different from the current one.";

  if (confirmPassword !== newPassword) errors.confirmPassword = "The passwords do not match.";
  return errors;
};
