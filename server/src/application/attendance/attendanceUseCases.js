import { createCrudUseCases } from "../shared/crudUseCases.js";
import { InvalidStateError, NotFoundError, ValidationError } from "../../domain/errors.js";
import { toDay } from "../../domain/dashboard/attendance.js";
import {
  assertValidAttendance,
  computeHoursWorked,
  hourlyRateFromSalary,
  pickAttendanceFields,
} from "../../domain/attendance/attendanceRules.js";

const TIME_FIELDS = ["employeeId", "timeIn", "lunchOut", "lunchIn", "timeOut", "hourlyRate"];

/**
 * Daily time records. An employee times in (which fixes the hourly rate for the day), may go out
 * to lunch and come back, then times out; the hours worked are time in to time out less lunch.
 * Administrators can also enter or correct a record by hand.
 *
 * @param {Object} deps
 * @param {import("../../domain/attendance/AttendanceRepository").AttendanceRepository} deps.attendanceRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {() => Date} [deps.now] the clock; tests pass a fixed one
 */
export const createAttendanceUseCases = ({
  attendanceRepository,
  employeeRepository,
  salaryRateRepository, // optional: without it the rate always comes from the salary
  now = () => new Date(),
}) => {
  const crud = createCrudUseCases({
    repository: attendanceRepository,
    entityName: "Attendance record",
    validate: assertValidAttendance,
    pickFields: pickAttendanceFields,
  });

  const findActiveEmployee = async (employeeId) => {
    const employee = typeof employeeId === "string" ? await employeeRepository.findById(employeeId) : null;
    if (!employee || employee.isActive === false) throw new NotFoundError("Employee not found");
    return employee;
  };

  /**
   * The rate for a working day. Only HR sets rates (see salaryRateUseCases), so a rate sent with an
   * attendance request is never used: it is the one HR assigned for that day, else one worked out
   * from the employee's monthly salary.
   */
  const resolveHourlyRate = async (employee, day) => {
    const assigned = salaryRateRepository ? await salaryRateRepository.findEffective(employee.id, day) : null;
    if (assigned) return assigned.hourlyRate;

    const derived = hourlyRateFromSalary(employee.salary);
    if (derived === null) {
      throw new ValidationError("This employee has no hourly rate yet. HR must assign one first.");
    }
    return derived;
  };

  const assertOneRecordPerDay = async (employeeId, date, exceptId) => {
    const existing = await attendanceRepository.findByEmployeeAndDate(employeeId, date);
    if (existing && existing.id !== exceptId) {
      throw new InvalidStateError("This employee already has an attendance record for that day");
    }
  };

  const openRecord = async (employeeId) => {
    await findActiveEmployee(employeeId);
    const open = await attendanceRepository.findOpenByEmployeeId(employeeId);
    if (!open) throw new InvalidStateError("This employee has not timed in");
    return open;
  };

  /** Writes one more time onto the open record, after checking it still reads in order. */
  const stamp = async (open, changes) => {
    const next = { ...open, ...changes };
    assertValidAttendance(next);
    return attendanceRepository.update(open.id, {
      ...changes,
      hoursWorked: computeHoursWorked(next),
    });
  };

  return {
    listAttendance: crud.list,
    listAttendancePage: crud.listPage,
    getAttendance: crud.get,
    deleteAttendance: crud.remove,

    /** Administrator enters a whole record. The rate defaults from the employee's salary. */
    async addAttendance(input = {}) {
      assertValidAttendance(input);
      const employee = await findActiveEmployee(input.employeeId);
      await assertOneRecordPerDay(input.employeeId, toDay(input.timeIn));

      return crud.add({ ...input, hourlyRate: await resolveHourlyRate(employee, toDay(input.timeIn)) });
    },

    /** Administrator corrects a record. Fields that are left out keep their stored value, the rate included. */
    async updateAttendance(id, input = {}) {
      const existing = await crud.get(id);
      const { hourlyRate: ignored, ...changes } = input;
      const merged = { ...Object.fromEntries(TIME_FIELDS.map((field) => [field, existing[field]])), ...changes };

      assertValidAttendance(merged);
      await assertOneRecordPerDay(merged.employeeId, toDay(merged.timeIn), id);
      return crud.update(id, merged);
    },

    /** Time in: starts the day and records the hourly rate it will be paid at. */
    async timeIn(employeeId) {
      const employee = await findActiveEmployee(employeeId);
      const time = now();

      if (await attendanceRepository.findOpenByEmployeeId(employeeId)) {
        throw new InvalidStateError("This employee is already timed in. Time out first.");
      }
      await assertOneRecordPerDay(employeeId, toDay(time));

      const rate = await resolveHourlyRate(employee, toDay(time));
      assertValidAttendance({ employeeId, timeIn: time, hourlyRate: rate });
      return crud.add({ employeeId, timeIn: time, hourlyRate: rate });
    },

    async lunchOut(employeeId) {
      const open = await openRecord(employeeId);
      if (open.lunchOut) throw new InvalidStateError("Lunch has already been taken today");
      return stamp(open, { lunchOut: now() });
    },

    async lunchIn(employeeId) {
      const open = await openRecord(employeeId);
      if (!open.lunchOut) throw new InvalidStateError("This employee has not gone out to lunch");
      if (open.lunchIn) throw new InvalidStateError("Lunch has already ended");
      return stamp(open, { lunchIn: now() });
    },

    /** Time out: closes the day and works out the hours. Lunch must be over first. */
    async timeOut(employeeId) {
      const open = await openRecord(employeeId);
      if (open.lunchOut && !open.lunchIn) throw new InvalidStateError("Come back from lunch before timing out");
      return stamp(open, { timeOut: now() });
    },
  };
};
