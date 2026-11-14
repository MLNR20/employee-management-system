import { CONTACT_TEXT_MAX } from "../domain/employee/emergencyContactRules";

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
 * The emergency contact block of the Add Employee form. values and errors are keyed by field
 * name; onChange(name, value) reports each edit. The whole block is optional.
 */
export default function EmergencyContactFields({ values, errors = {}, onChange }) {
  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold text-gray-900">Emergency Contact</h2>
      <p className="mb-4 text-sm text-gray-500">
        Optional. Fill in the person to call in an emergency; more contacts can be added later from Emergency Contacts.
      </p>
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        {fields.map(({ name, label, placeholder, type = "text", maxLength }) => (
          <div key={name}>
            <label htmlFor={`contact_${name}`} className="block mb-2 text-sm font-medium text-gray-900">
              {label}
            </label>
            <input
              type={type}
              id={`contact_${name}`}
              value={values[name] ?? ""}
              maxLength={maxLength}
              onChange={(e) => onChange(name, e.target.value)}
              className={inputClass}
              placeholder={placeholder}
              autoComplete="off"
            />
            {errors[name] && <label className="text-sm text-red-500">{errors[name]}</label>}
          </div>
        ))}
      </div>
    </div>
  );
}
