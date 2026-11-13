// Present-versus-absent figures. There is no clock-in data, so "absent" means "on approved leave":
// an employee with an approved leave request covering that day is absent, every other active
// employee is present. Days are calendar days as "YYYY-MM-DD" (UTC), which compare correctly as text.

export const toDay = (value) => new Date(value).toISOString().slice(0, 10);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const addDays = (day, amount) => toDay(new Date(`${day}T00:00:00.000Z`).getTime() + amount * MS_PER_DAY);

const isWeekend = (day) => [0, 6].includes(new Date(`${day}T00:00:00.000Z`).getUTCDay());

/** The distinct employees whose approved leave covers `day`. */
export const absentOn = (day, leaves) =>
  new Set(
    leaves
      .filter((leave) => toDay(leave.startDate) <= day && day <= toDay(leave.endDate))
      .map((leave) => leave.employeeId)
  );

/**
 * One point per working day (Monday to Friday) in the `days` calendar days that end on `today`.
 * The active headcount is today's: leavers and joiners are not tracked historically.
 *
 * @param {{today: string, days: number, activeCount: number, leaves: Array<{employeeId: string, startDate: Date, endDate: Date}>}} input
 * @returns {Array<{date: string, present: number, absent: number}>}
 */
export function buildAttendance({ today, days, activeCount, leaves }) {
  const series = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = addDays(today, -offset);
    if (isWeekend(day)) continue;
    const absent = absentOn(day, leaves).size;
    series.push({ date: day, present: Math.max(0, activeCount - absent), absent });
  }
  return series;
}

/** The first day `days` calendar days ending on `today` covers. */
export const rangeStart = (today, days) => addDays(today, -(days - 1));
