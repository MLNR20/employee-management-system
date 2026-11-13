import { absentOn, buildAttendance, rangeStart, toDay } from "../../domain/dashboard/attendance.js";

export const DEFAULT_DAYS = 14;
export const MAX_DAYS = 90;

const clampDays = (value) => {
  const days = Number.parseInt(value, 10);
  return Number.isFinite(days) && days > 0 ? Math.min(days, MAX_DAYS) : DEFAULT_DAYS;
};

/**
 * Figures for the dashboard. "Absent" means on approved leave (see domain/dashboard/attendance.js).
 *
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 * @param {() => Date} [deps.now] the clock, replaceable in tests
 */
export const createDashboardUseCases = ({ employeeRepository, leaveRequestRepository, now = () => new Date() }) => ({
  /** Headcount today: total, active, present and absent (on approved leave). */
  async summary() {
    const today = toDay(now());
    const [headcount, leaves] = await Promise.all([
      employeeRepository.summary(),
      leaveRequestRepository.findApprovedBetween(today, today),
    ]);
    const absent = absentOn(today, leaves).size;
    return {
      date: today,
      total: headcount.total,
      active: headcount.active,
      inactive: headcount.inactive,
      present: Math.max(0, headcount.active - absent),
      absent,
    };
  },

  /** Present versus absent for each working day in the last `days` calendar days (default 14, at most 90). */
  async attendance({ days } = {}) {
    const range = clampDays(days);
    const today = toDay(now());
    const [headcount, leaves] = await Promise.all([
      employeeRepository.summary(),
      leaveRequestRepository.findApprovedBetween(rangeStart(today, range), today),
    ]);
    return buildAttendance({ today, days: range, activeCount: headcount.active, leaves });
  },
});
