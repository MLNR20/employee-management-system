import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import PortalLayout from "../../components/employee/PortalLayout";
import { dayOf } from "../../components/employee/LeaveCalendar";
import { employeePortal } from "../../container";

const messageOf = (error) => error?.response?.data?.message ?? "Something went wrong. Please try again.";

/** Every leave request the employee has filed, newest first, with a side panel for the details. */
export default function EmployeeLeaveRequests() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [detailId, setDetailId] = useState(null);

  useEffect(() => {
    if (!detailId) return undefined;
    const onKey = (event) => event.key === "Escape" && setDetailId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detailId]);

  const types = useQuery({ queryKey: ["employee-portal", "leave-types"], queryFn: employeePortal.getLeaveTypes });
  const requests = useQuery({ queryKey: ["employee-portal", "leave-requests"], queryFn: employeePortal.getLeaveRequests });

  const leaves = (requests.data ?? [])
    .map((r) => ({ ...r, startDate: dayOf(r.startDate), endDate: dayOf(r.endDate) }))
    .sort((a, b) => b.startDate.localeCompare(a.startDate));
  const typeName = (id) => (types.data ?? []).find((t) => t._id === id)?.name ?? "Leave";

  const cancel = useMutation({
    mutationFn: employeePortal.cancelLeave,
    onSuccess: () => {
      enqueueSnackbar("Leave request cancelled.", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: ["employee-portal", "leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["employee-portal", "leave-balances"] });
    },
    onError: (error) => enqueueSnackbar(messageOf(error), { variant: "error" }),
  });

  const detail = leaves.find((leave) => leave._id === detailId);

  return (
    <PortalLayout>
      <section className="portal-panel" aria-labelledby="leave-requests-heading">
        <h2 id="leave-requests-heading" className="portal-panel-title">
          My leaves
        </h2>
        <div className="leave-file-row">
          <Link to="/employee/leave" className="leave-cancel leave-link">
            Back to leave calendar
          </Link>
        </div>

        {leaves.length === 0 ? (
          <p className="portal-empty">{requests.isLoading ? "Loading…" : "You have not filed any leave yet."}</p>
        ) : (
          <ul className="leave-list">
            {leaves.map((leave) => (
              <li key={leave._id} className="leave-item leave-item-clickable">
                <button
                  type="button"
                  className="leave-item-open"
                  aria-haspopup="dialog"
                  aria-label={`View details of ${typeName(leave.leaveTypeId)}, ${leave.startDate}`}
                  onClick={() => setDetailId(leave._id)}
                >
                  <span className="leave-item-title">{typeName(leave.leaveTypeId)}</span>
                  <span className="leave-item-meta">
                    {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`} · {leave.days}{" "}
                    {leave.days === 1 ? "day" : "days"}
                  </span>
                  {leave.reason && <span className="leave-item-meta">{leave.reason}</span>}
                </button>
                <div className="leave-item-side">
                  <span className={`leave-badge leave-badge-${leave.status}`}>{leave.status}</span>
                  {leave.status === "pending" && (
                    <button type="button" className="leave-cancel" onClick={() => cancel.mutate(leave._id)} disabled={cancel.isPending}>
                      Cancel
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detail && (
        <>
          <div className="leave-drawer-backdrop" onMouseDown={() => setDetailId(null)} />
          <aside className="leave-drawer" role="dialog" aria-modal="true" aria-labelledby="leave-detail-heading">
            <div className="leave-drawer-head">
              <h2 id="leave-detail-heading" className="portal-panel-title">
                Leave details
              </h2>
              <button type="button" className="leave-drawer-close" aria-label="Close details" onClick={() => setDetailId(null)}>
                ×
              </button>
            </div>
            <div className="leave-drawer-body">
              <p className="leave-drawer-type">{typeName(detail.leaveTypeId)}</p>
              <span className={`leave-badge leave-badge-${detail.status}`}>{detail.status}</span>
              <dl className="portal-details leave-drawer-details">
                <div className="portal-detail-row">
                  <dt>First day</dt>
                  <dd>{detail.startDate}</dd>
                </div>
                <div className="portal-detail-row">
                  <dt>Last day</dt>
                  <dd>{detail.endDate}</dd>
                </div>
                <div className="portal-detail-row">
                  <dt>Days</dt>
                  <dd>{detail.days}</dd>
                </div>
                {(detail.dateCreated || detail.createdAt) && (
                  <div className="portal-detail-row">
                    <dt>Filed on</dt>
                    <dd>{new Date(detail.dateCreated || detail.createdAt).toLocaleDateString()}</dd>
                  </div>
                )}
                <div className="portal-detail-row">
                  <dt>Reason</dt>
                  <dd>{detail.reason || "None given"}</dd>
                </div>
                {detail.decision && (
                  <>
                    <div className="portal-detail-row">
                      <dt>{detail.decision.decision === "approved" ? "Approved by" : "Rejected by"}</dt>
                      <dd>{detail.decision.decidedBy}</dd>
                    </div>
                    {detail.decision.decidedAt && (
                      <div className="portal-detail-row">
                        <dt>Decided on</dt>
                        <dd>{new Date(detail.decision.decidedAt).toLocaleDateString()}</dd>
                      </div>
                    )}
                    {detail.decision.remarks && (
                      <div className="portal-detail-row">
                        <dt>Remarks</dt>
                        <dd>{detail.decision.remarks}</dd>
                      </div>
                    )}
                  </>
                )}
                {!detail.decision && detail.status === "pending" && (
                  <div className="portal-detail-row">
                    <dt>Approval</dt>
                    <dd>Waiting for an administrator</dd>
                  </div>
                )}
              </dl>
              {detail.status === "pending" && (
                <button
                  type="button"
                  className="leave-cancel"
                  onClick={() => {
                    cancel.mutate(detail._id);
                    setDetailId(null);
                  }}
                  disabled={cancel.isPending}
                >
                  Cancel this request
                </button>
              )}
            </div>
          </aside>
        </>
      )}
    </PortalLayout>
  );
}
