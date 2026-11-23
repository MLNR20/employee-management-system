import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import PortalLayout from "../../components/employee/PortalLayout";
import SidebarIcon from "../../components/SidebarIcon";
import LeaveCalendar, { dayOf, inclusiveDays } from "../../components/employee/LeaveCalendar";
import { employeePortal } from "../../container";

const emptyForm = { leaveTypeId: "", startDate: "", endDate: "", reason: "" };

/** An icon for a leave type, picked from its name; anything unrecognised gets the calendar. */
const iconFor = (name) => {
  const n = name.toLowerCase();
  if (/sick|medical|health/.test(n)) return "heart";
  if (/vacation|annual|holiday|paid/.test(n)) return "sun";
  if (/emergency|urgent/.test(n)) return "bolt";
  if (/maternity|paternity|parental|family|bereave/.test(n)) return "users";
  return "calendar";
};

const messageOf = (error) => error?.response?.data?.message ?? "Something went wrong. Please try again.";

/** The employee's leave: a calendar of their leave, the form to apply for more, and their requests. */
export default function EmployeeLeave() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [month, setMonth] = useState(() => new Date());
  const [form, setForm] = useState(emptyForm);
  const [pickingEnd, setPickingEnd] = useState(false);
  const [open, setOpen] = useState(false);

  const closeModal = () => {
    setOpen(false);
    setPickingEnd(false);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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
      closeModal();
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

  const balanceList = balances.data ?? [];

  return (
    <PortalLayout>
      <section aria-labelledby="leave-available-heading" className="leave-available">
        <h2 id="leave-available-heading" className="portal-panel-title">
          Available leaves
        </h2>
        {balanceList.length === 0 ? (
          <p className="portal-empty">{balances.isLoading ? "Loading…" : "No leave balances have been set up for you yet."}</p>
        ) : (
          <ul className="leave-icon-grid">
            {balanceList.map((balance) => {
              const left = balance.availableLeaves;
              const percent = balance.maxLeaves > 0 ? Math.max(0, Math.min(100, (left / balance.maxLeaves) * 100)) : 0;
              const name = typeName(balance.leaveTypeId);
              return (
                <li key={balance._id} className="leave-icon-card">
                  <span className="leave-icon-badge">
                    <SidebarIcon name={iconFor(name)} />
                  </span>
                  <div className="leave-icon-body">
                    <p className="leave-item-title">{name}</p>
                    <p className="leave-balance-count">
                      <strong>{left}</strong> of {balance.maxLeaves} {balance.maxLeaves === 1 ? "day" : "days"} left
                    </p>
                    <div className="leave-balance-bar" role="presentation">
                      <div className="leave-balance-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="portal-panel" aria-labelledby="leave-calendar-heading">
        <h2 id="leave-calendar-heading" className="portal-panel-title">
          Leave calendar
        </h2>
        <div className="leave-file-row">
          <button type="button" className="leave-submit" onClick={() => setOpen(true)}>
            File leave
          </button>
          <Link to="/employee/leave/requests" className="leave-cancel leave-link">
            View my leaves
          </Link>
        </div>
        <LeaveCalendar
          month={month}
          onMonthChange={setMonth}
          leaves={leaves}
          selection={{ start: form.startDate, end: form.endDate }}
          onPickDay={pickDay}
        />
      </section>

      {open && (
        <div className="leave-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && closeModal()}>
          <div className="leave-modal" role="dialog" aria-modal="true" aria-labelledby="leave-apply-heading">
            <h2 id="leave-apply-heading" className="portal-panel-title">
              File leave
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

              <div className="leave-actions">
                <button type="submit" className="leave-submit" disabled={apply.isPending}>
                  {apply.isPending ? "Sending…" : "Apply for leave"}
                </button>
                <button
                  type="button"
                  className="leave-cancel"
                  onClick={() => {
                    setForm(emptyForm);
                    closeModal();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PortalLayout>
  );
}
