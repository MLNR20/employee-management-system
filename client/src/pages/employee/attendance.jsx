import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSnackbar } from "notistack";
import PortalLayout from "../../components/employee/PortalLayout";
import { SkeletonRows } from "../../components/Skeleton";
import { employeePortal } from "../../container";

const QUERY_KEY = ["employee-portal", "attendance"];

const messageOf = (error) => error?.response?.data?.message ?? "Something went wrong. Please try again.";

const timeText = (value) => (value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");
const dayText = (value) =>
  new Date(`${value}T00:00:00`).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });

/** The day's four stamps, in order, for the timeline. */
const STEPS = [
  { key: "timeIn", label: "Time in" },
  { key: "lunchOut", label: "Lunch out" },
  { key: "lunchIn", label: "Lunch in" },
  { key: "timeOut", label: "Time out" },
];

/**
 * What the employee can press next. Time in starts the day; lunch is optional; time out ends it and
 * needs lunch to be over. The server enforces the same order, this only offers the valid buttons.
 */
const actionsFor = (today) => {
  if (!today) return [{ step: "time-in", label: "Time in", primary: true }];
  if (today.timeOut) return [];
  if (today.lunchOut && !today.lunchIn) return [{ step: "lunch-in", label: "Back from lunch", primary: true }];
  return [
    ...(today.lunchOut ? [] : [{ step: "lunch-out", label: "Lunch out" }]),
    { step: "time-out", label: "Time out", primary: true },
  ];
};

const statusOf = (today) => {
  if (!today) return "Not timed in";
  if (today.timeOut) return "Done for today";
  if (today.lunchOut && !today.lunchIn) return "On lunch";
  return "Working";
};

/** Elapsed time as "H:MM:SS". */
const durationText = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const pad = (n) => String(n).padStart(2, "0");
  return `${Math.floor(total / 3600)}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`;
};

/** The employee's attendance: a clock with the buttons for the next step, today's stamps and the recent days. */
export default function EmployeeAttendance() {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const attendance = useQuery({ queryKey: QUERY_KEY, queryFn: employeePortal.getAttendance });
  const today = attendance.data?.today ?? null;
  const recent = attendance.data?.recent ?? [];

  const clock = useMutation({
    mutationFn: employeePortal.clock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (error) => {
      enqueueSnackbar(messageOf(error), { variant: "error" });
      queryClient.invalidateQueries({ queryKey: QUERY_KEY }); // the buttons may be out of date
    },
  });

  const actions = actionsFor(today);

  return (
    <PortalLayout>
      <div className="portal-column">
        <section className="portal-panel" aria-labelledby="attendance-clock-heading">
          <h2 id="attendance-clock-heading" className="portal-panel-title">
            Clock in
          </h2>

          <div className="clock-face">
            <p className="clock-time" aria-live="off">
              {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </p>
            <p className="clock-date">{now.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            <p className={`clock-status clock-status-${attendance.isLoading ? "none" : statusOf(today).toLowerCase().replace(/\s+/g, "-")}`}>
              {attendance.isLoading ? "Loading…" : statusOf(today)}
            </p>
          </div>

          {today?.lunchOut && (
            <div className={`clock-lunch${today.lunchIn ? "" : " clock-lunch-live"}`} aria-label="Lunch break">
              <span className="clock-lunch-label">{today.lunchIn ? "Lunch break taken" : "On lunch for"}</span>
              <span className="clock-lunch-time">
                {durationText((today.lunchIn ? new Date(today.lunchIn) : now) - new Date(today.lunchOut))}
              </span>
            </div>
          )}

          <div className="clock-actions">
            {actions.map(({ step, label, primary }) => (
              <button
                key={step}
                type="button"
                className={primary ? "leave-submit" : "leave-cancel"}
                onClick={() => clock.mutate(step)}
                disabled={clock.isPending || attendance.isLoading}
              >
                {label}
              </button>
            ))}
            {!attendance.isLoading && actions.length === 0 && <p className="portal-empty">You have timed out. See you tomorrow!</p>}
          </div>

          {today && (
            <ol className="clock-steps" aria-label="Today">
              {STEPS.map(({ key, label }) => (
                <li key={key} className={`clock-step${today[key] ? " clock-step-done" : ""}`}>
                  <span className="clock-step-label">{label}</span>
                  <span className="clock-step-time">{timeText(today[key])}</span>
                </li>
              ))}
            </ol>
          )}
          {today?.lateMinutes > 0 && <p className="leave-hint">You timed in {today.lateMinutes} min late.</p>}
        </section>

        <section className="portal-panel" aria-labelledby="attendance-history-heading">
          <h2 id="attendance-history-heading" className="portal-panel-title">
            Attendance history
          </h2>
          {recent.length === 0 && !attendance.isLoading ? (
            <p className="portal-empty">No attendance yet.</p>
          ) : (
            <div className="attendance-table-wrap">
              <table className="attendance-table" aria-busy={attendance.isLoading}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Time in</th>
                    <th scope="col">Lunch out</th>
                    <th scope="col">Lunch in</th>
                    <th scope="col">Time out</th>
                    <th scope="col">Hours</th>
                    <th scope="col">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.isLoading && <SkeletonRows rows={5} columns={7} />}
                  {recent.map((record) => (
                    <tr key={record._id}>
                      <th scope="row">{dayText(record.date)}</th>
                      <td>{timeText(record.timeIn)}</td>
                      <td>{timeText(record.lunchOut)}</td>
                      <td>{timeText(record.lunchIn)}</td>
                      <td>{timeText(record.timeOut)}</td>
                      <td>
                        {record.hoursWorked == null ? (
                          <span className="leave-badge leave-badge-pending">Open</span>
                        ) : (
                          `${record.hoursWorked} h`
                        )}
                      </td>
                      <td>{record.lateMinutes > 0 ? `${record.lateMinutes} min` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </PortalLayout>
  );
}
