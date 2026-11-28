import { InvalidStateError, NotFoundError } from "../../domain/errors.js";
import { assertValidPeriod, buildPayroll } from "../../domain/payroll/payrollRules.js";
import { buildFinalPay, readFinalPayInput } from "../../domain/payroll/finalPayRules.js";

/**
 * The payroll report (hours, gross pay, deductions and net pay per employee for a period) and the final
 * pay of a leaving employee. Like the salary-rate use cases, these do not check who is asking: the HTTP
 * layer only routes HR here ("salary-rates:view").
 *
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/attendance/AttendanceRepository").AttendanceRepository} deps.attendanceRepository
 * @param {import("../../domain/salary/SalaryRateRepository").SalaryRateRepository} deps.salaryRateRepository
 * @param {import("../../domain/Repository").Repository} [deps.payrollDeductionRepository] without it nothing is deducted
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} [deps.leaveBalanceRepository]
 *   with leaveTypeRepository, the unused paid leave that final pay converts
 * @param {import("../../domain/leave/LeaveTypeRepository").LeaveTypeRepository} [deps.leaveTypeRepository]
 */
export const createPayrollUseCases = ({
  employeeRepository,
  attendanceRepository,
  salaryRateRepository,
  payrollDeductionRepository,
  leaveBalanceRepository,
  leaveTypeRepository,
}) => ({
  /** Payroll for the days from `from` to `to` ("YYYY-MM-DD", both included). */
  async report({ from, to } = {}) {
    assertValidPeriod({ from, to });

    const [employees, attendance, rates, deductionRules] = await Promise.all([
      employeeRepository.findAll(),
      attendanceRepository.findBetween(from, to),
      salaryRateRepository.findAll(),
      payrollDeductionRepository?.findAll() ?? [],
    ]);

    return buildPayroll({ employees, attendance, rates, deductionRules, from, to });
  },

  /**
   * What a leaving employee is still owed, worked out afresh each time and stored nowhere.
   * `input`: { from?, leaveDays?, adjustments?: [{ label, amount }] }, see finalPayRules.
   */
  async finalPay(employeeId, input = {}) {
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) throw new NotFoundError("Employee not found");
    if (!employee.separation) {
      throw new InvalidStateError("Final pay is worked out during offboarding: start this employee's offboarding first");
    }
    const { lastWorkingDay } = employee.separation;
    const options = readFinalPayInput(input, lastWorkingDay);
    const yearStart = `${lastWorkingDay.slice(0, 4)}-01-01`;

    const [attendance, rates, deductionRules, balances, leaveTypes] = await Promise.all([
      attendanceRepository.findBetween(options.from < yearStart ? options.from : yearStart, lastWorkingDay, employeeId),
      salaryRateRepository.findByEmployeeId(employeeId),
      payrollDeductionRepository?.findAll() ?? [],
      leaveBalanceRepository?.findByEmployeeId(employeeId) ?? [],
      leaveTypeRepository?.findAll() ?? [],
    ]);

    const paidLeave = balances.flatMap((balance) => {
      const type = leaveTypes.find((t) => t.id === balance.leaveTypeId);
      return type?.isPaid && balance.availableLeaves > 0
        ? [{ name: type.name, availableDays: balance.availableLeaves }]
        : [];
    });

    return buildFinalPay({ employee, attendance, rates, deductionRules, paidLeave, lastWorkingDay, options });
  },
});
