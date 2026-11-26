import { useState } from "react";
import PageLayout from "../../components/PageLayout";
import EmployeeChecklist from "../../components/EmployeeChecklist";
import { useEmployees } from "../../hooks/useEntities";

/** The onboarding checklist of one employee. The offboarding one lives on the Offboarding page. */
export default function DocumentChecklist() {
  const [employeeId, setEmployeeId] = useState("");
  const { data: employees = [] } = useEmployees();

  return (
    <PageLayout title="Document Checklist">
      <div className="mb-6 max-w-md">
        <label htmlFor="employee" className="block mb-2 text-sm font-medium text-gray-900">
          Employee
        </label>
        <select
          id="employee"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5"
        >
          <option value="">Choose an employee</option>
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.fullName}
            </option>
          ))}
        </select>
      </div>

      {employeeId ? (
        <EmployeeChecklist employeeId={employeeId} stage="onboarding" />
      ) : (
        <p className="text-gray-500">Choose an employee to see which documents they still owe.</p>
      )}
    </PageLayout>
  );
}
