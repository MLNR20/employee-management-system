import { assertValidPeriod, buildPayroll } from "../../domain/payroll/payrollRules.js";

/**
 * The payroll report: hours worked and gross pay per employee for a period. Like the salary-rate use
 * cases, these do not check who is asking: the HTTP layer only routes HR here ("salary-rates:view").
 *
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/attendance/AttendanceRepository").AttendanceRepository} deps.attendanceRepository
 * @param {import("../../domain/salary/SalaryRateRepository").SalaryRateRepository} deps.salaryRateRepository
 */
export const createPayrollUseCases = ({ employeeRepository, attendanceRepository, salaryRateRepository }) => ({
  /** Payroll for the days from `from` to `to` ("YYYY-MM-DD", both included). */
  async report({ from, to } = {}) {
    assertValidPeriod({ from, to });

    const [employees, attendance, rates] = await Promise.all([
      employeeRepository.findAll(),
      attendanceRepository.findBetween(from, to),
      salaryRateRepository.findAll(),
    ]);

    return buildPayroll({ employees, attendance, rates, from, to });
  },
});
