import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import PortalLayout from "../../components/employee/PortalLayout";
import LeaveCalendar, { dayOf, inclusiveDays } from "../../components/employee/LeaveCalendar";
import { employeePortal } from "../../container";

const emptyForm = { leaveTypeId: "", startDate: "", endDate: "", reason: "" };

const messageOf = (error) => error?.response?.data?.message ?? "Something went wrong. Please try again.";

/** The employee's leave: a calendar of their leave, the form to apply for more, and their requests. */
export default function EmployeeLeave() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [month, setMonth] = useState(() => new Date());
  const [form, setForm] = useState(emptyForm);
  const [pickingEnd, setPickingEnd] = useState(false);

  const types = useQuery({ queryKey: ["employee-portal", "leave-types"], queryFn: employeePortal.getLeaveTypes });
  const balances = useQuery({ queryKey: ["employee-portal", "leave-balances"], queryFn: employeePortal.getLeaveBalances });
  const requests = useQuery({ queryKey: ["employee-portal", "leave-requests"], queryFn: employeePortal.getLeaveRequests });

  const leaves = (requests.data ?? []).map((r) => ({ ...r, startDate: dayOf(r.startDate), endDate: dayOf(r.endDate) }));
  const typeName = (id) => (types.data ?? []).find((t) => t._id === id)?.name ?? "Leave";
  const balanceFor = (typeId) => (balances.data ?? []).find((b) => b.leaveTypeId === typeId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["employee-portal", "leave-requests"] });
    queryClient.invalidateQueries({ queryKey: ["employee-portal", "leave-balances"] });
  };

  const apply = useMutation({
    mutationFn: employeePortal.applyForLeave,
    onSuccess: () => {
      enqueueSnackbar("Leave request sent. It stays pending until an administrator decides it.", { variant: "success" });
      setForm(emptyForm);
      setPickingEnd(false);
      refresh();
    },
    onError: (error) => enqueueSnackbar(messageOf(error), { variant: "error" }),
  });

  const cancel = useMutation({
    mutationFn: employeePortal.cancelLeave,
    onSuccess: () => {
      enqueueSnackbar("Leave request cancelled.", { variant: "success" });
      refresh();
    },
    onError: (error) => enqueueSnackbar(messageOf(error), { variant: "error" }),
  });

  // First click starts a range, the second ends it (a day before the start restarts it).
  const pickDay = (day) => {
    if (!pickingEnd || !form.startDate || day < form.startDate) {
      setForm((f) => ({ ...f, startDate: day, endDate: day }));
      setPickingEnd(true);
    } else {
      setForm((f) => ({ ...f, endDate: day }));
      setPickingEnd(false);
    }
  };

  const change = (name) => (event) => setForm((f) => ({ ...f, [name]: event.target.value }));

  const days = form.startDate && form.endDate && form.endDate >= form.startDate ? inclusiveDays(form.startDate, form.endDate) : 0;
  const available = form.leaveTypeId ? balanceFor(form.leaveTypeId)?.availableLeaves : undefined;

  const submit = (event) => {
    event.preventDefault();
    if (!form.leaveTypeId) return enqueueSnackbar("Choose a leave type.", { variant: "error" });
    if (!form.startDate || !form.endDate) return enqueueSnackbar("Choose the first and last day.", { variant: "error" });
    if (form.endDate < form.startDate) return enqueueSnackbar("The last day cannot be before the first day.", { variant: "error" });
    apply.mutate({ ...form, reason: form.reason.trim() });
  };

  return (
    <PortalLayout>
      <div className="portal-columns">
        <div className="portal-column">
          <section className="portal-panel" aria-labelledby="leave-calendar-heading">
            <h2 id="leave-calendar-heading" className="portal-panel-title">
              Leave calendar
            </h2>
            <LeaveCalendar
              month={month}
              onMonthChange={setMonth}
              leaves={leaves}
              selection={{ start: form.startDate, end: form.endDate }}
              onPickDay={pickDay}
            />
          </section>

          <section className="portal-panel" aria-labelledby="leave-requests-heading">
            <h2 id="leave-requests-heading" className="portal-panel-title">
              My leave requests
            </h2>
            {leaves.length === 0 ? (
              <p className="portal-empty">{requests.isLoading ? "Loading…" : "You have not applied for leave yet."}</p>
            ) : (
              <ul className="leave-list">
                {[...leaves]
                  .sort((a, b) => b.startDate.localeCompare(a.startDate))
                  .map((leave) => (
                    <li key={leave._id} className="leave-item">
                      <div>
                        <p className="leave-item-title">{typeName(leave.leaveTypeId)}</p>
                        <p className="leave-item-meta">
                          {leave.startDate === leave.endDate ? leave.startDate : `${leave.startDate} to ${leave.endDate}`} ·{" "}
                          {leave.days} {leave.days === 1 ? "day" : "days"}
                        </p>
                        {leave.reason && <p className="leave-item-meta">{leave.reason}</p>}
                      </div>
                      <div className="leave-item-side">
                        <span className={`leave-badge leave-badge-${leave.status}`}>{leave.status}</span>
                        {leave.status === "pending" && (
                          <button
                            type="button"
                            className="leave-cancel"
                            onClick={() => cancel.mutate(leave._id)}
                            disabled={cancel.isPending}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>

        <section className="portal-panel portal-updates" aria-labelledby="leave-apply-heading">
          <h2 id="leave-apply-heading" className="portal-panel-title">
            Apply for leave
          </h2>
          <form onSubmit={submit} noValidate className="leave-form">
            <label htmlFor="leave-type">Leave type</label>
            <select id="leave-type" value={form.leaveTypeId} onChange={change("leaveTypeId")}>
              <option value="">Select a leave type…</option>
              {(types.data ?? []).map((type) => {
                const balance = balanceFor(type._id);
                return (
                  <option key={type._id} value={type._id} disabled={!balance}>
                    {type.name} {balance ? `(${balance.availableLeaves} days left)` : "(no balance)"}
                  </option>
                );
              })}
            </select>

            <label htmlFor="leave-start">First day</label>
            <input id="leave-start" type="date" value={form.startDate} onChange={change("startDate")} />

            <label htmlFor="leave-end">Last day</label>
            <input id="leave-end" type="date" value={form.endDate} min={form.startDate || undefined} onChange={change("endDate")} />

            <label htmlFor="leave-reason">Reason (optional)</label>
            <textarea id="leave-reason" rows={3} value={form.reason} onChange={change("reason")} />

            <p className="leave-summary" aria-live="polite">
              {days > 0 ? `${days} ${days === 1 ? "day" : "days"} requested` : "Pick days on the calendar or enter dates."}
              {days > 0 && available !== undefined && days > available ? ` · only ${available} left` : ""}
            </p>
            <p className="leave-hint">Weekends count as leave days.</p>

            <button type="submit" className="leave-submit" disabled={apply.isPending}>
              {apply.isPending ? "Sending…" : "Apply for leave"}
            </button>
          </form>
        </section>
      </div>
    </PortalLayout>
  );
}
