const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (n) => String(n).padStart(2, "0");

/** "YYYY-MM-DD" for a local date. The calendar works in these strings, never in time zones. */
export const toDay = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** The day part of a stored date such as "2030-03-04T00:00:00.000Z". */
export const dayOf = (value) => String(value).slice(0, 10);

/** Calendar days from start to end, both included (the server counts leave the same way). */
export const inclusiveDays = (start, end) => {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  return Math.round((Date.UTC(ey, em - 1, ed) - Date.UTC(sy, sm - 1, sd)) / 86400000) + 1;
};

/**
 * A month of days. Days covered by leave are tinted by status (pending or approved); the days the
 * employee is picking for a new request are outlined. Clicking a day reports it to the page.
 *
 * @param {Date} month any date inside the month to show
 * @param {(month: Date) => void} onMonthChange
 * @param {{startDate: string, endDate: string, status: string}[]} leaves
 * @param {{start: string, end: string}} selection the days picked so far ("" when none)
 * @param {(day: string) => void} onPickDay
 */
export default function LeaveCalendar({ month, onMonthChange, leaves, selection, onPickDay }) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = toDay(new Date());

  const covering = (day) =>
    leaves.filter((leave) => ["pending", "approved"].includes(leave.status) && leave.startDate <= day && day <= leave.endDate);
  const picked = (day) => selection.start && day >= selection.start && day <= (selection.end || selection.start);

  const cells = [
    ...Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} className="leave-cal-blank" />),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = `${year}-${pad(monthIndex + 1)}-${pad(i + 1)}`;
      const leave = covering(day);
      const status = leave.some((l) => l.status === "approved") ? "approved" : leave.length ? "pending" : "";
      const classes = ["leave-cal-day"];
      if (day === today) classes.push("leave-cal-today");
      if (status) classes.push(`leave-cal-${status}`);
      if (picked(day)) classes.push("leave-cal-picked");
      return (
        <button
          key={day}
          type="button"
          className={classes.join(" ")}
          onClick={() => onPickDay(day)}
          aria-label={`${day}${status ? `, ${status} leave` : ""}`}
          aria-pressed={Boolean(picked(day))}
        >
          {i + 1}
        </button>
      );
    }),
  ];

  const shift = (by) => onMonthChange(new Date(year, monthIndex + by, 1));

  return (
    <div className="leave-cal">
      <div className="leave-cal-header">
        <button type="button" className="leave-cal-nav" onClick={() => shift(-1)} aria-label="Previous month">
          ‹
        </button>
        <h3 className="leave-cal-title" aria-live="polite">
          {month.toLocaleString("en-US", { month: "long", year: "numeric" })}
        </h3>
        <button type="button" className="leave-cal-nav" onClick={() => shift(1)} aria-label="Next month">
          ›
        </button>
      </div>
      <div className="leave-cal-grid">
        {WEEKDAYS.map((name) => (
          <span key={name} className="leave-cal-weekday">
            {name}
          </span>
        ))}
        {cells}
      </div>
      <ul className="leave-cal-legend">
        <li>
          <span className="leave-cal-swatch leave-cal-approved" /> Approved
        </li>
        <li>
          <span className="leave-cal-swatch leave-cal-pending" /> Pending
        </li>
        <li>
          <span className="leave-cal-swatch leave-cal-picked" /> Selected
        </li>
      </ul>
    </div>
  );
}
