import { useEmployees } from "../hooks/useEntities";

const selectClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

/**
 * Picks the employee someone reports to. Leaving it on "No manager" clears it.
 * `excludeId` is the employee being edited, who cannot be their own manager. Inactive employees are
 * not offered, except one who is already the manager, so the form still shows who it is.
 */
export default function ManagerSelect({ value, onChange, excludeId }) {
  const { data: employees = [] } = useEmployees();

  const options = employees
    .filter((employee) => employee.id !== excludeId && (employee.isActive !== false || employee.id === value))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  return (
    <div>
      <label htmlFor="managerId" className="block mb-2 text-sm font-medium text-gray-900">
        Manager
      </label>
      <select id="managerId" value={value ?? ""} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">No manager</option>
        {options.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.fullName}
            {employee.isActive === false ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">Who this employee reports to.</p>
    </div>
  );
}

/** A manager's name for a table cell: a dash for none, "(removed)" if they no longer exist. */
export function ManagerName({ id }) {
  const { data: employees = [] } = useEmployees();

  if (!id) return <span className="text-gray-400">-</span>;
  return employees.find((employee) => employee.id === id)?.fullName ?? "(removed)";
}
