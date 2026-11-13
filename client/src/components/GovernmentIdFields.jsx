import { governmentIds } from "../domain/employee/governmentIds";

const inputClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12";

/**
 * The four government ID inputs (SSS, TIN, PhilHealth, Pag-IBIG) as a two-column block.
 * values and errors are keyed by field name; onChange(name, value) reports each edit.
 */
export default function GovernmentIdFields({ values, errors = {}, onChange }) {
  return (
    <div className="mt-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">Government IDs</h2>
      <div className="grid gap-6 mb-6 md:grid-cols-2">
        {governmentIds.map((def) => (
          <div key={def.name}>
            <label htmlFor={def.name} className="block mb-2 text-sm font-medium text-gray-900">
              {def.label}
            </label>
            <input
              type="text"
              inputMode="numeric"
              id={def.name}
              value={values[def.name] ?? ""}
              onChange={(e) => onChange(def.name, e.target.value)}
              className={inputClass}
              placeholder={def.placeholder}
              autoComplete="off"
            />
            {errors[def.name] && <label className="text-sm text-red-500">{errors[def.name]}</label>}
          </div>
        ))}
      </div>
    </div>
  );
}
