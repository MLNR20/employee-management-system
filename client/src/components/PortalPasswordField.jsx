import PasswordInput from "./PasswordInput";

export const PORTAL_PASSWORD_MIN = 8;
export const PORTAL_PASSWORD_MAX = 72;

/** An error message when a typed portal password is unusable; blank is fine (it is optional). */
export const validatePortalPassword = (value) =>
  value && (value.length < PORTAL_PASSWORD_MIN || value.length > PORTAL_PASSWORD_MAX)
    ? `Portal password must be ${PORTAL_PASSWORD_MIN} to ${PORTAL_PASSWORD_MAX} characters.`
    : undefined;

/** The password an employee signs in to the employee portal with, set by an administrator. */
export default function PortalPasswordField({ value, error, onChange, hint }) {
  return (
    <div className="mt-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Employee portal</h2>
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        <div>
          <label htmlFor="portalPassword" className="block mb-2 text-sm font-medium text-gray-900">
            Portal password
          </label>
          <PasswordInput
            id="portalPassword"
            name="portalPassword"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
          />
          {error ? (
            <label className="text-sm text-red-500">{error}</label>
          ) : (
            hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>
          )}
        </div>
      </div>
    </div>
  );
}
