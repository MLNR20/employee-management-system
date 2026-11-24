import { Link } from "react-router-dom";
import { useEmployees, useLeaveTypes } from "../hooks/useEntities";
import { LeaveStatus, dateOnly } from "../domain/leave/Leave";
import { nameOf } from "../resources/shared";

const SHOWN = 6;

/**
 * Pending tasks for the dashboard: leave requests still waiting for a decision, oldest first.
 * Deciding them happens on the Leave Requests page, which this links to.
 *
 * requests: LeaveRequest[]   every leave request; this component picks the pending ones
 */
export default function PendingTasks({ requests }) {
  const { data: employees = [] } = useEmployees();
  const { data: leaveTypes = [] } = useLeaveTypes();

  const pending = requests
    .filter((request) => request.status === LeaveStatus.PENDING)
    .sort((a, b) => new Date(a.dateCreated ?? 0) - new Date(b.dateCreated ?? 0));

  if (pending.length === 0) {
    return <p className="text-sm text-gray-500 p-4">Nothing is waiting for a decision.</p>;
  }

  return (
    <div>
      <ul className="list-none p-0 m-0 divide-y divide-gray-200">
        {pending.slice(0, SHOWN).map((request) => {
          const from = dateOnly(request.startDate);
          const to = dateOnly(request.endDate);
          return (
            <li key={request.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {nameOf(employees, request.employeeId, (e) => e.fullName)}
                    <span className="font-normal text-gray-500">
                      {" "}
                      · {nameOf(leaveTypes, request.leaveTypeId, (t) => t.name)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {from === to ? from : `${from} to ${to}`} · {request.days} {request.days === 1 ? "day" : "days"}
                  </p>
                  {request.dateCreated && (
                    <p className="text-xs text-gray-400">Filed {request.dateCreated.toLocaleDateString()}</p>
                  )}
                </div>
                <span className="shrink-0 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                  Pending
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-sm text-gray-500">
        {pending.length > SHOWN && `${pending.length - SHOWN} more. `}
        <Link to="/leave-requests" className="underline hover:text-gray-900">
          Review leave requests
        </Link>
      </p>
    </div>
  );
}
