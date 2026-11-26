import { useState } from "react";
import { validatePasswordChange } from "../domain/auth/passwordRules";

const blank = { currentPassword: "", newPassword: "", confirmPassword: "" };

const fields = [
  { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
  { name: "newPassword", label: "New password", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Repeat the new password", autoComplete: "new-password" },
];

/**
 * Current password, new password twice. Used by both the administrators and the employee portal.
 * `onSubmit({ currentPassword, newPassword })` returns a promise; the form empties when it succeeds and
 * shows the server's message when it does not.
 */
export default function ChangePasswordForm({ onSubmit }) {
  const [values, setValues] = useState(blank);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (name) => (event) => {
    setValues((previous) => ({ ...previous, [name]: event.target.value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validatePasswordChange(values);
    setErrors(found);
    setFailure("");
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await onSubmit({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setValues(blank);
    } catch (error) {
      setFailure(error.response?.data?.message ?? "Could not change the password.");
    } finally {
      setSaving(false);
    }
  };

  // The "leave-form" styles are plain CSS, so they look right in both the portal and the admin pages.
  return (
    <form onSubmit={submit} noValidate className="leave-form" style={{ maxWidth: "24rem" }}>
      {fields.map(({ name, label, autoComplete }) => (
        <div key={name}>
          <label htmlFor={name}>{label}</label>
          <input id={name} type="password" autoComplete={autoComplete} value={values[name]} onChange={set(name)} />
          {errors[name] && <p className="text-sm text-red-600">{errors[name]}</p>}
        </div>
      ))}
      {failure && (
        <p className="text-sm text-red-600" role="alert">
          {failure}
        </p>
      )}
      <div className="leave-actions">
        <button type="submit" className="leave-submit" disabled={saving}>
          {saving ? "Saving…" : "Change password"}
        </button>
      </div>
    </form>
  );
}
