import { useState } from "react";
import Swal from "sweetalert2";
import PageLayout from "../../components/PageLayout";
import { Badge } from "../../resources/shared";
import {
  useCreateEmployeeDocument,
  useDocumentChecklist,
  useEmployees,
  useReviewDocument,
  useUpdateEmployeeDocument,
} from "../../hooks/useEntities";
import { canReceive, canReject, canVerify } from "../../domain/document/Document";

const stateTones = {
  missing: "bg-gray-100 text-gray-700",
  pending: "bg-yellow-100 text-yellow-700",
  received: "bg-blue-100 text-blue-700",
  verified: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};

const buttonClass = "focus:outline-none text-white font-medium rounded-lg text-sm px-3 py-1.5 whitespace-nowrap";

const showError = (title) => (error) =>
  Swal.fire(title, error.response?.data?.message ?? "Something went wrong.", "error");

/** Asks for the expiry date of a document that expires. Resolves to the date, or undefined if cancelled. */
const askExpiry = (requirement, current) =>
  Swal.fire({
    title: `${requirement.name}: expiry date`,
    input: "date",
    inputValue: current ?? "",
    inputValidator: (value) => (value ? undefined : "Enter the date the document expires."),
    showCancelButton: true,
    confirmButtonText: "Save",
  }).then((result) => (result.isConfirmed ? result.value : undefined));

export default function DocumentChecklist() {
  const [employeeId, setEmployeeId] = useState("");
  const { data: employees = [] } = useEmployees();
  const { data: checklist, isLoading, error } = useDocumentChecklist(employeeId);

  const create = useCreateEmployeeDocument();
  const update = useUpdateEmployeeDocument();
  const review = useReviewDocument();

  // Records a copy as received: a new record when there is none, otherwise a new copy of the old one.
  const receive = async ({ requirement, document }) => {
    const expiryDate = requirement.hasExpiry ? await askExpiry(requirement, document?.expiryDate) : undefined;
    if (requirement.hasExpiry && !expiryDate) return;

    const done = { onError: showError("Could not record the document") };
    if (document) {
      update.mutate({ id: document.id, data: { status: "received", ...(expiryDate && { expiryDate }) } }, done);
    } else {
      create.mutate({ employeeId, requirementId: requirement.id, status: "received", ...(expiryDate && { expiryDate }) }, done);
    }
  };

  const verify = ({ document }) => review.mutate({ id: document.id, action: "verify" }, { onError: showError("Could not verify") });

  const reject = ({ requirement, document }) =>
    Swal.fire({
      title: `Reject ${requirement.name}?`,
      input: "text",
      inputLabel: "Why? The employee will see this.",
      inputValidator: (value) => (value?.trim() ? undefined : "Say why the document is rejected."),
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Reject",
    }).then((result) => {
      if (!result.isConfirmed) return;
      review.mutate({ id: document.id, action: "reject", remarks: result.value }, { onError: showError("Could not reject") });
    });

  const summary = checklist?.summary;
  const percent = summary?.required ? Math.round((summary.requiredVerified / summary.required) * 100) : 0;

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

      {!employeeId && <p className="text-gray-500">Choose an employee to see which documents they still owe.</p>}
      {employeeId && isLoading && <p className="text-gray-500">Loading...</p>}
      {employeeId && error && <p className="text-red-600">{error.response?.data?.message ?? "Could not load the checklist."}</p>}

      {checklist && (
        <>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1 text-sm">
              <span className="font-medium text-gray-900">
                {summary.requiredVerified} of {summary.required} required documents verified
              </span>
              {summary.complete ? (
                <Badge value="complete" tones={{ complete: "bg-green-100 text-green-700" }} />
              ) : (
                <span className="text-gray-500">
                  {summary.missing} missing · {summary.received} awaiting review · {summary.rejected} rejected · {summary.expired} expired
                </span>
              )}
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-2 rounded-full bg-green-600" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {checklist.items.length === 0 ? (
            <p className="text-gray-500">There are no document requirements yet. Add some under Document Requirements.</p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th className="px-4 py-3">Document</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Received</th>
                    <th className="px-4 py-3">Expires</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.items.map((item) => {
                    const { requirement, document, state } = item;
                    return (
                      <tr key={requirement.id} className="border-t border-gray-100">
                        <th scope="row" className="px-4 py-3 font-medium text-gray-900">
                          {requirement.name}
                          {!requirement.isRequired && <span className="ml-2 text-xs font-normal text-gray-400">optional</span>}
                          {requirement.description && (
                            <span className="block text-xs font-normal text-gray-500">{requirement.description}</span>
                          )}
                        </th>
                        <td className="px-4 py-3">
                          <Badge value={state} tones={stateTones} />
                        </td>
                        <td className="px-4 py-3">{document?.receivedAt ? document.receivedAt.toLocaleDateString() : "-"}</td>
                        <td className="px-4 py-3">{document?.expiryDate ?? (requirement.hasExpiry ? "not set" : "-")}</td>
                        <td className="px-4 py-3 text-gray-600">{document?.remarks || ""}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-row gap-2">
                            {canReceive(state) && (
                              <button className={`${buttonClass} bg-blue-700 hover:bg-blue-800`} onClick={() => receive(item)}>
                                {state === "rejected" || state === "expired" ? "New copy" : "Mark received"}
                              </button>
                            )}
                            {canVerify(state) && (
                              <button className={`${buttonClass} bg-green-700 hover:bg-green-800`} onClick={() => verify(item)}>
                                Verify
                              </button>
                            )}
                            {canReject(state) && (
                              <button className={`${buttonClass} bg-red-700 hover:bg-red-800`} onClick={() => reject(item)}>
                                Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
