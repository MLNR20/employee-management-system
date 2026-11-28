import { Link } from "react-router-dom";
import { useAdministrators, useEmployees, useLeaveApprovals, useLeaveTypes } from "../hooks/useEntities";
import { LeaveStatus, dateOnly } from "../domain/leave/Leave";
import { nameOf } from "../resources/shared";
import { ListSkeleton, SkeletonBar } from "./Skeleton";

const SHOWN = 6;

/** "Approved by Jane Doe on 3/4/2025", read from the approval record the manager's decision created. */
function ApprovedBy({ request, administrators }) {
  const { data: approvals = [], isLoading } = useLeaveApprovals(request.id);
  const approval = approvals[approvals.length - 1];
  if (isLoading) return <SkeletonBar width="10rem" style={{ height: "1rem" }} />;
  if (!approval) return <span>Approved</span>;

  return (
    <span>
      Approved by {nameOf(administrators, approval.approverId, (a) => a.fullName)}
      {approval.dateCreated && ` on ${approval.dateCreated.toLocaleDateString()}`}
    </span>
  );
}

/**
 * Urgent notifications for the dashboard: leave that has been approved by a manager and has not ended yet,
 * soonest first. Pending, rejected and cancelled requests never appear here.
 *
 * requests: LeaveRequest[]   every leave request; this component picks the ones to show
 */
export default function UrgentLeaves({ requests }) {
  const { data: employees = [], isLoading: loadingEmployees } = useEmployees();
  const { data: leaveTypes = [], isLoading: loadingTypes } = useLeaveTypes();
  const { data: administrators = [], isLoading: loadingAdministrators } = useAdministrators();

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = requests
    .filter((request) => request.status === LeaveStatus.APPROVED && dateOnly(request.endDate) >= today)
    .sort((a, b) => dateOnly(a.startDate).localeCompare(dateOnly(b.startDate)));

  // Wait for the names, so nobody shows as "(removed)" while they load.
  if (upcoming.length > 0 && (loadingEmployees || loadingTypes || loadingAdministrators)) {
    return <ListSkeleton rows={Math.min(upcoming.length, SHOWN)} label="Loading the urgent notifications" />;
  }

  if (upcoming.length === 0) {
    return <p className="text-sm text-gray-500 p-4">No manager-approved leave is coming up.</p>;
  }

  return (
    <div>
      <ul className="list-none p-0 m-0 divide-y divide-gray-200">
        {upcoming.slice(0, SHOWN).map((request) => {
          const ongoing = dateOnly(request.startDate) <= today;
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
                  <p className="text-xs text-gray-400">
                    <ApprovedBy request={request} administrators={administrators} />
                  </p>
                </div>
                <span
                  className={`shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                    ongoing ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  }`}
                >
                  {ongoing ? "On leave now" : "Approved"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {upcoming.length > SHOWN && (
        <p className="mt-3 text-sm text-gray-500">
          {upcoming.length - SHOWN} more.{" "}
          <Link to="/leave-requests" className="underline hover:text-gray-900">
            See all leave requests
          </Link>
        </p>
      )}
    </div>
  );
}
