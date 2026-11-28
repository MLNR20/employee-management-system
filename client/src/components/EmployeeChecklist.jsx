import Swal from "sweetalert2";
import { Badge } from "../resources/shared";
import DocumentFileLink from "./DocumentFileLink";
import { ACCEPTED_FILES, describeFileUsage, fileError } from "../domain/document/fileRules";
import {
  useAccess,
  useCreateEmployeeDocument,
  useDocumentChecklist,
  useDocumentFile,
  useReviewDocument,
  useUpdateEmployeeDocument,
} from "../hooks/useEntities";
import { canReceive, canReject, canVerify } from "../domain/document/Document";

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

/**
 * One employee's document checklist for a stage ("onboarding" or "offboarding"): progress, then a line
 * per document with the actions to record, verify or reject it.
 */
export default function EmployeeChecklist({ employeeId, stage = "onboarding" }) {
  const { data: checklist, isLoading, error } = useDocumentChecklist(employeeId, stage);

  const create = useCreateEmployeeDocument();
  const update = useUpdateEmployeeDocument();
  const review = useReviewDocument();
  const files = useDocumentFile();
  const { can } = useAccess();
  const mayVerify = can("documents:verify");
  // A first copy creates a record; a new copy of one edits it.
  const mayReceive = (document) => can(document ? "documents:edit" : "documents:create");

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

  // Uploading counts as handing the document in. An expired or rejected one needs its new expiry date.
  const upload = async ({ requirement, document, state }, file) => {
    const problem = fileError(file, checklist.files?.maxFileBytes);
    if (problem) return Swal.fire("Cannot upload", problem, "error");

    const needsExpiry = requirement.hasExpiry && (!document?.expiryDate || state === "expired" || state === "rejected");
    const expiryDate = needsExpiry ? await askExpiry(requirement, document?.expiryDate) : undefined;
    if (needsExpiry && !expiryDate) return undefined;

    const record = document
      ? expiryDate && { expiryDate }
      : // Pending until the upload succeeds, so a refused file never counts as handed in.
        { employeeId, requirementId: requirement.id, status: "pending", ...(expiryDate && { expiryDate }) };
    return files.mutate({ id: document?.id, file, record }, { onError: showError("Could not upload") });
  };

  const removeFile = ({ document }) =>
    Swal.fire({
      title: "Remove this file?",
      text: "It is taken off this document. The database keeps it, so it still counts towards the system's storage limit.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Remove",
    }).then((result) => {
      if (result.isConfirmed) files.mutate({ id: document.id }, { onError: showError("Could not remove the file") });
    });

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

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error.response?.data?.message ?? "Could not load the checklist."}</p>;
  if (!checklist) return null;

  const { summary } = checklist;
  const percent = summary.required ? Math.round((summary.requiredVerified / summary.required) * 100) : 0;
  const fileUsage = checklist.files && describeFileUsage(checklist.files);

  return (
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

      {fileUsage && (
        <div className="mb-3 text-sm">
          <p className="text-gray-500">{fileUsage.usage}</p>
          {fileUsage.warning && (
            <p className="text-red-600" role="alert">
              {fileUsage.warning}
            </p>
          )}
        </div>
      )}

      {checklist.items.length === 0 ? (
        <p className="text-gray-500">
          There are no {stage} document requirements yet. Add some under Document Requirements.
        </p>
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
                <th className="px-4 py-3">File</th>
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
                      <div className="flex flex-col items-start gap-1">
                        {document?.file ? <DocumentFileLink file={document.file} /> : <span className="text-gray-400">-</span>}
                        {mayReceive(document) && (
                          <label className="text-gray-700 text-xs font-medium border border-gray-300 rounded-lg px-2 py-1 cursor-pointer hover:bg-gray-50 whitespace-nowrap">
                            {document?.file ? "Replace file" : "Upload file"}
                            <input
                              type="file"
                              accept={ACCEPTED_FILES}
                              className="sr-only"
                              aria-label={`Upload ${requirement.name}`}
                              disabled={files.isPending}
                              onChange={(event) => {
                                const [file] = event.target.files;
                                event.target.value = ""; // so the same file can be chosen again
                                if (file) upload(item, file);
                              }}
                            />
                          </label>
                        )}
                        {document?.file && can("documents:edit") && (
                          <button type="button" className="text-xs text-red-700 hover:underline" onClick={() => removeFile(item)}>
                            Remove file
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-row gap-2">
                        {canReceive(state) && mayReceive(document) && (
                          <button type="button" className={`${buttonClass} bg-blue-700 hover:bg-blue-800`} onClick={() => receive(item)}>
                            {state === "rejected" || state === "expired" ? "New copy" : "Mark received"}
                          </button>
                        )}
                        {canVerify(state) && mayVerify && (
                          <button type="button" className={`${buttonClass} bg-green-700 hover:bg-green-800`} onClick={() => verify(item)}>
                            Verify
                          </button>
                        )}
                        {canReject(state) && mayVerify && (
                          <button type="button" className={`${buttonClass} bg-red-700 hover:bg-red-800`} onClick={() => reject(item)}>
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
  );
}
