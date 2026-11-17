import { CONTACT_TEXT_MAX, newContactRow } from "../domain/employee/emergencyContactRules";

const inputClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12";

const fields = [
  { name: "firstName", label: "First name", placeholder: "Enter contact first name..." },
  { name: "lastName", label: "Last name", placeholder: "Enter contact last name..." },
  { name: "relationship", label: "Relationship", placeholder: "For example: Mother, Spouse, Friend", maxLength: CONTACT_TEXT_MAX.relationship },
  { name: "phoneNumber", label: "Phone number", placeholder: "Enter contact phone number...", type: "tel" },
  { name: "email", label: "Email (optional)", placeholder: "Enter contact email...", type: "email" },
  { name: "address", label: "Address (optional)", placeholder: "Enter contact address...", maxLength: CONTACT_TEXT_MAX.address },
];

/**
 * The emergency contacts block of the Add and Edit Employee forms. An employee can have several, so
 * it shows one card per row (see emergencyContactRules) with Add and Remove buttons.
 *
 * rows        the form rows: { key, id?, firstName, ... }
 * errors      { [row.key]: { [field]: message } }
 * onChange    (rows) => void, called with the updated list of rows
 * onEdit      (row.key) => void, called when a row is edited so its errors can be cleared
 *
 * The block is optional: blank new rows are ignored when the employee is saved.
 */
export default function EmergencyContactFields({ rows, errors = {}, onChange, onEdit = () => {} }) {
  const setField = (key, name, value) => {
    onChange(rows.map((row) => (row.key === key ? { ...row, [name]: value } : row)));
    onEdit(key);
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Emergency Contacts</h2>
      <p className="mb-4 text-sm text-gray-500">
        Optional. The people to call in an emergency. Add as many as you need; blank contacts are not saved.
      </p>

      {rows.length === 0 && <p className="mb-4 text-sm text-gray-500">No emergency contacts.</p>}

      {rows.map((row, index) => (
        <div key={row.key} className="p-4 mb-4 border border-gray-200 rounded-lg" data-testid="contact-row">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Contact {index + 1}</h3>
            <button
              type="button"
              onClick={() => onChange(rows.filter((other) => other.key !== row.key))}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Remove
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {fields.map(({ name, label, placeholder, type = "text", maxLength }) => (
              <div key={name}>
                <label htmlFor={`contact_${row.key}_${name}`} className="block mb-2 text-sm font-medium text-gray-900">
                  {label}
                </label>
                <input
                  type={type}
                  id={`contact_${row.key}_${name}`}
                  value={row[name] ?? ""}
                  maxLength={maxLength}
                  onChange={(e) => setField(row.key, name, e.target.value)}
                  className={inputClass}
                  placeholder={placeholder}
                  autoComplete="off"
                />
                {errors[row.key]?.[name] && <label className="text-sm text-red-500">{errors[row.key][name]}</label>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...rows, newContactRow()])}
        className="px-4 py-2 mb-2 text-sm font-medium text-blue-700 border border-blue-700 rounded-lg hover:bg-blue-50"
      >
        + Add emergency contact
      </button>
    </div>
  );
}
