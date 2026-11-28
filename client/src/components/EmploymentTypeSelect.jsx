import { useEmploymentTypes } from "../hooks/useEntities";
import { SkeletonBar } from "./Skeleton";

const selectClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

/**
 * Picks an employee's employment type. Leaving it on "No employment type" clears it. Inactive types are
 * not offered, except one the employee already holds, so the form still shows it.
 */
export default function EmploymentTypeSelect({ value, onChange }) {
  const { data: types = [] } = useEmploymentTypes();

  const options = types
    .filter((type) => type.isActive !== false || type.id === value)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <label htmlFor="employmentTypeId" className="block mb-2 text-sm font-medium text-gray-900">
        Employment type
      </label>
      <select
        id="employmentTypeId"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
      >
        <option value="">No employment type</option>
        {/* A deleted type is no longer listed, but the employee still holds it: show that instead of a blank choice. */}
        {value && !types.some((type) => type.id === value) && <option value={value}>(deleted employment type)</option>}
        {options.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
            {type.isActive === false ? " (inactive)" : ""}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-gray-500">Manage the list under Organization, Employment Types.</p>
    </div>
  );
}

/** An employment type's name for a table cell: a dash for none, "(deleted)" if it was deleted. */
export function EmploymentTypeName({ id }) {
  const { data: types = [], isLoading } = useEmploymentTypes();

  if (!id) return <span className="text-gray-400">-</span>;
  if (isLoading) return <SkeletonBar width="6rem" />;
  return types.find((type) => type.id === id)?.name ?? "(deleted)";
}
