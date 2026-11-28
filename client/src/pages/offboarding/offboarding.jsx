import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import PageLayout from "../../components/PageLayout";
import EmployeeChecklist from "../../components/EmployeeChecklist";
import RehireTag from "../../components/RehireTag";
import FinalPay from "../../components/FinalPay";
import DocumentFileLink from "../../components/DocumentFileLink";
import { useAccess, useEmployees, useOffboarding, useOffboardingAction } from "../../hooks/useEntities";
import {
  NOTES_MAX,
  OffboardingStatus,
  REHIRE_OPTIONS,
  RehireStatus,
  SEPARATION_TYPES,
  employmentStage,
  separationTypeLabel,
  validateSeparation,
} from "../../domain/employee/separation";

const inputClass = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5";
const buttonClass = "focus:outline-none text-white font-medium rounded-lg text-sm px-4 py-2.5";

const stageLabels = {
  active: "",
  offboarding: "offboarding",
  offboarded: "offboarded",
  inactive: "inactive",
};

const blank = { separationType: "", lastWorkingDay: "", reason: "", rehireStatus: "", rehireNotes: "" };

const showError = (error) => Swal.fire("Could not save", error.response?.data?.message ?? "Something went wrong.", "error");

const confirm = (title, text, confirmButtonText, confirmButtonColor = "#3F7D58") =>
  Swal.fire({ title, text, icon: "warning", showCancelButton: true, confirmButtonText, confirmButtonColor }).then(
    (result) => result.isConfirmed
  );

function Field({ id, label, error, hint, wide, children }) {
  return (
    <div style={wide ? { gridColumn: "1 / -1" } : undefined}>
      <label htmlFor={id} className="block mb-2 text-sm font-medium text-gray-900">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}

/** Starts an offboarding, or edits the details and rehire tag of an existing one. */
function SeparationForm({ initial = blank, completed = false, submitLabel, isSubmitting, onSubmit }) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (name) => (event) => {
    setValues((previous) => ({ ...previous, [name]: event.target.value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateSeparation(values);
    setErrors(found);
    if (Object.keys(found).length === 0) onSubmit(values);
  };

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 md:grid-cols-2">
      <Field id="separationType" label="How they are leaving" error={errors.separationType}>
        <select id="separationType" value={values.separationType} onChange={set("separationType")} className={inputClass}>
          <option value="">Choose one</option>
          {SEPARATION_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field id="lastWorkingDay" label="Last working day" error={errors.lastWorkingDay}>
        <input id="lastWorkingDay" type="date" value={values.lastWorkingDay} onChange={set("lastWorkingDay")} className={inputClass} />
      </Field>
      <Field id="reason" label="Reason for leaving" wide>
        <textarea id="reason" rows={2} maxLength={NOTES_MAX} value={values.reason} onChange={set("reason")} className={inputClass} />
      </Field>
      <Field
        id="rehireStatus"
        label="Rehire tag"
        hint={completed ? undefined : "Can be decided later, but is required to complete the offboarding."}
      >
        <select id="rehireStatus" value={values.rehireStatus} onChange={set("rehireStatus")} className={inputClass}>
          {!completed && <option value="">Decide later</option>}
          {REHIRE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </Field>
      <Field
        id="rehireNotes"
        label={values.rehireStatus === RehireStatus.NON_REHIREABLE ? "Why non-rehireable (required)" : "Rehire notes"}
        error={errors.rehireNotes}
      >
        <input id="rehireNotes" type="text" maxLength={NOTES_MAX} value={values.rehireNotes} onChange={set("rehireNotes")} className={inputClass} />
      </Field>
      <div style={{ gridColumn: "1 / -1" }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ opacity: isSubmitting ? 0.5 : 1 }}
          className={`${buttonClass} bg-blue-700 hover:bg-blue-800`}
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function ClearanceLine({ done, children }) {
  return (
    <li className="flex gap-2 py-1">
      <span aria-hidden="true" className={done ? "text-green-700" : "text-red-600"}>
        {done ? "✓" : "✗"}
      </span>
      <span className="sr-only">{done ? "Done:" : "Outstanding:"}</span>
      <span className="text-gray-700">{children}</span>
    </li>
  );
}

/** What is still owed by, or to be sorted out for, the leaving employee. */
function Clearance({ clearance }) {
  const { documents, heldItems, directReports, pendingLeave, cleared } = clearance;

  return (
    <section className="p-4 border border-gray-200 rounded-lg">
      <h2 className="mb-2 text-lg font-semibold text-gray-900">
        Clearance {cleared && <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Cleared</span>}
      </h2>
      <ul className="text-sm">
        <ClearanceLine done={documents.requiredVerified === documents.required}>
          {documents.requiredVerified} of {documents.required} required offboarding documents verified
        </ClearanceLine>
        <ClearanceLine done={heldItems.length === 0}>
          {heldItems.length === 0 ? (
            "No company equipment held"
          ) : (
            <>
              Still holds {heldItems.map((item) => `${item.name} (${item.serialNumber})`).join(", ")}.{" "}
              <Link to="/inventory" className="text-blue-700 hover:underline">
                Take it back in Inventory
              </Link>
            </>
          )}
        </ClearanceLine>
        <ClearanceLine done={directReports.length === 0}>
          {directReports.length === 0
            ? "Nobody reports to them"
            : `Still manages ${directReports.map((r) => r.name).join(", ")}. Give them another manager before completing.`}
        </ClearanceLine>
        <ClearanceLine done={pendingLeave === 0}>
          {pendingLeave === 0 ? (
            "No undecided leave requests"
          ) : (
            <>
              {pendingLeave} leave request{pendingLeave === 1 ? "" : "s"} awaiting a decision.{" "}
              <Link to="/leave-requests" className="text-blue-700 hover:underline">
                Open leave requests
              </Link>
            </>
          )}
        </ClearanceLine>
      </ul>
    </section>
  );
}

function History({ entries }) {
  const showFiles = useAccess().can("documents:view");
  if (!entries.length) return null;
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-gray-900">Earlier offboardings</h2>
      <ul className="text-sm text-gray-700">
        {entries.map((entry) => (
          <li key={entry.startedAt} className="py-1">
            {separationTypeLabel(entry.separationType)}, last working day {entry.lastWorkingDay}. Rehired on{" "}
            {new Date(entry.rehiredAt).toLocaleDateString()} ({entry.documents.filter((d) => d.status === "verified").length} documents
            had been verified).
            {showFiles &&
              entry.documents
                .filter((d) => d.file)
                .map((d) => (
                  <span key={d.file.id} className="block pl-4">
                    {d.requirement}: <DocumentFileLink file={d.file} />
                  </span>
                ))}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One employee's offboarding: start it, then tag them, track clearance and collect the documents. */
function EmployeeOffboarding({ employeeId, employeeName }) {
  const { data, isLoading, error } = useOffboarding(employeeId);
  const action = useOffboardingAction();
  const { can } = useAccess();
  const mayChange = can("employees:edit");

  if (isLoading) return <p className="text-gray-500">Loading...</p>;
  if (error) return <p className="text-red-600">{error.response?.data?.message ?? "Could not load the offboarding."}</p>;
  if (!data) return null;

  const { separation, rehireStatus, clearance, history, isActive } = data;
  const run = (name, details, success) =>
    action.mutate(
      { employeeId, name, details },
      { onSuccess: () => success && Swal.fire(success, "", "success"), onError: showError }
    );

  if (!separation && !mayChange) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500">This employee is not being offboarded.</p>
        <History entries={history} />
      </div>
    );
  }

  if (!separation) {
    return (
      <div className="space-y-6">
        <section>
          <h2 className="mb-1 text-lg font-semibold text-gray-900">{isActive ? "Start offboarding" : "Record the offboarding"}</h2>
          <p className="mb-4 text-sm text-gray-500">
            {isActive
              ? "The employee stays active until you complete the offboarding. Starting it opens their document checklist."
              : "This employee is inactive but has no offboarding, so they are not tagged. Record it to tag them."}
          </p>
          <SeparationForm
            submitLabel="Start offboarding"
            isSubmitting={action.isPending}
            onSubmit={(values) => run("start", values)}
          />
        </section>
        <History entries={history} />
      </div>
    );
  }

  const completed = separation.status === OffboardingStatus.COMPLETED;

  const complete = async () => {
    const outstanding = clearance.cleared ? "" : "Some clearance items are still outstanding; you can finish them afterwards. ";
    if (await confirm("Complete the offboarding?", `${outstanding}The employee becomes inactive and loses portal access.`, "Complete")) {
      run("complete", undefined, "Offboarding completed");
    }
  };
  const cancel = async () => {
    if (await confirm("Cancel this offboarding?", "The documents recorded for it are discarded.", "Cancel offboarding", "#d33")) {
      run("cancel");
    }
  };
  const rehire = async () => {
    if (await confirm("Rehire this employee?", "They become active again and this offboarding moves to their history.", "Rehire")) {
      run("rehire", undefined, "Employee rehired");
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-1 rounded-full text-sm font-medium ${
            completed ? "bg-gray-100 text-gray-700" : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {completed ? "Offboarded" : "Offboarding in progress"}
        </span>
        <RehireTag employee={{ rehireStatus, isActive, separation }} />
        <span className="text-sm text-gray-500">
          {separationTypeLabel(separation.separationType)} · last working day {separation.lastWorkingDay}
        </span>
      </section>

      {mayChange ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Details and rehire tag</h2>
          {/* Keyed on the stored values, so the form refills after a save but not on a background refresh. */}
          <SeparationForm
            key={JSON.stringify([separation, rehireStatus])}
            initial={{ ...blank, ...separation, rehireStatus }}
            completed={completed}
            submitLabel="Save details"
            isSubmitting={action.isPending}
            onSubmit={({ separationType, lastWorkingDay, reason, rehireStatus: tag, rehireNotes }) =>
              run("update", { separationType, lastWorkingDay, reason, rehireStatus: tag, rehireNotes }, "Saved")
            }
          />
        </section>
      ) : (
        <section className="text-sm text-gray-700">
          {separation.reason && <p>Reason for leaving: {separation.reason}</p>}
          {separation.rehireNotes && <p>Rehire notes: {separation.rehireNotes}</p>}
        </section>
      )}

      <Clearance clearance={clearance} />

      {can("salary-rates:view") && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Final pay</h2>
          {/* Keyed on the last working day, so a result never outlives the date it was worked out for. */}
          <FinalPay key={separation.lastWorkingDay} employeeId={employeeId} employeeName={employeeName} />
        </section>
      )}

      {can("documents:view") && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">Offboarding documents</h2>
          <EmployeeChecklist employeeId={employeeId} stage="offboarding" />
        </section>
      )}

      <section className="flex flex-wrap items-center gap-2">
        {mayChange && !completed && (
          <>
            <button type="button" disabled={action.isPending || !rehireStatus} onClick={complete}
              style={{ opacity: rehireStatus ? 1 : 0.5 }} className={`${buttonClass} bg-green-700 hover:bg-green-800`}>
              Complete offboarding
            </button>
            <button type="button" disabled={action.isPending} onClick={cancel} className={`${buttonClass} bg-red-700 hover:bg-red-800`}>
              Cancel offboarding
            </button>
            {!rehireStatus && <span className="text-sm text-gray-500">Save a rehire tag to complete.</span>}
          </>
        )}
        {mayChange && completed && rehireStatus === RehireStatus.REHIREABLE && (
          <button type="button" disabled={action.isPending} onClick={rehire} className={`${buttonClass} bg-green-700 hover:bg-green-800`}>
            Rehire
          </button>
        )}
        {completed && rehireStatus === RehireStatus.NON_REHIREABLE && (
          <span className="text-sm text-red-600">Non-rehireable: this employee cannot be rehired.</span>
        )}
      </section>

      <History entries={history} />
    </div>
  );
}

/** Everyone who is leaving or has left, so untagged and unfinished ones are easy to find. */
function Leavers({ employees, onChoose }) {
  const leavers = employees.filter((employee) => employmentStage(employee) !== "active");
  if (leavers.length === 0) return <p className="text-gray-500">Nobody is offboarding. Choose an employee to start.</p>;

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Last working day</th>
            <th className="px-4 py-3">Rehire tag</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leavers.map((employee) => (
            <tr key={employee.id} className="border-t border-gray-100">
              <th scope="row" className="px-4 py-3 font-medium text-gray-900">{employee.fullName}</th>
              <td className="px-4 py-3" style={{ textTransform: "capitalize" }}>{employmentStage(employee)}</td>
              <td className="px-4 py-3">{employee.separation?.lastWorkingDay ?? "-"}</td>
              <td className="px-4 py-3">
                <RehireTag employee={employee} />
              </td>
              <td className="px-4 py-3">
                <button type="button" className="text-blue-700 font-medium hover:underline" onClick={() => onChoose(employee.id)}>
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Offboarding() {
  // The chosen employee is in the address, so the employee list can link straight here.
  const [params, setParams] = useSearchParams();
  const employeeId = params.get("employee") ?? "";
  const { data: employees = [] } = useEmployees();
  const choose = (id) => setParams(id ? { employee: id } : {});

  return (
    <PageLayout title="Offboarding">
      <div className="mb-6 max-w-md">
        <label htmlFor="employee" className="block mb-2 text-sm font-medium text-gray-900">
          Employee
        </label>
        <select id="employee" value={employeeId} onChange={(e) => choose(e.target.value)} className={inputClass}>
          <option value="">Choose an employee</option>
          {employees.map((employee) => {
            const stage = stageLabels[employmentStage(employee)];
            return (
              <option key={employee.id} value={employee.id}>
                {employee.fullName}
                {stage ? ` (${stage})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      {employeeId ? (
        // Keyed so that a half-typed form never carries over to another employee.
        <EmployeeOffboarding
          key={employeeId}
          employeeId={employeeId}
          employeeName={employees.find((employee) => employee.id === employeeId)?.fullName ?? "employee"}
        />
      ) : (
        <Leavers employees={employees} onChoose={choose} />
      )}
    </PageLayout>
  );
}
