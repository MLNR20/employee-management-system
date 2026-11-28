import { Link } from "react-router-dom";
import { useDepartments, usePositions } from "../hooks/useEntities";
import { departmentChoices, positionChoices } from "../domain/position/choices";

const selectClass =
  "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5";

function Choices({ id, value, onChange, choices, placeholder, disabled }) {
  return (
    <select id={id} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} className={selectClass}>
      <option value="">{placeholder}</option>
      {choices.map(({ name, listed }) => (
        <option key={name} value={name}>
          {name}
          {listed ? "" : " (no longer listed)"}
        </option>
      ))}
    </select>
  );
}

/** Picks one of the departments under Organization. The employee's current one is always offered. */
export function DepartmentSelect({ value, onChange }) {
  const { data: departments = [] } = useDepartments();
  return (
    <Choices
      id="department"
      value={value}
      onChange={onChange}
      choices={departmentChoices(departments, value)}
      placeholder="Choose a department"
    />
  );
}

/** Picks one of the chosen department's positions. The employee's current one is always offered. */
export function PositionSelect({ department, value, onChange }) {
  const { data: departments = [] } = useDepartments();
  const { data: positions = [], isSuccess } = usePositions();
  const choices = positionChoices(departments, positions, department, value);

  return (
    <>
      <Choices
        id="position"
        value={value}
        onChange={onChange}
        choices={choices}
        disabled={!department}
        placeholder={department ? "Choose a position" : "Choose a department first"}
      />
      {department && isSuccess && choices.length === 0 && (
        <p className="mt-1 text-xs text-gray-500">
          This department has no positions yet. Add them under{" "}
          <Link to="/positions" className="text-blue-700 hover:underline">
            Positions
          </Link>
          .
        </p>
      )}
    </>
  );
}
