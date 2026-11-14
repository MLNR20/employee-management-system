import { createCrudUseCases } from "../shared/crudUseCases.js";
import { InvalidStateError, NotFoundError, ValidationError } from "../../domain/errors.js";
import { localDay, lateMinutesFor } from "../../domain/attendance/localTime.js";
import {
  assertValidAttendance,
  computeHoursWorked,
  hourlyRateFromSalary,
  pickAttendanceFields,
} from "../../domain/attendance/attendanceRules.js";

const TIME_FIELDS = ["employeeId", "timeIn", "lunchOut", "lunchIn", "timeOut", "hourlyRate"];

/**
 * Daily time records. An employee times in (which fixes the hourly rate for the day and, when they
 * have a shift, how late they were), may go out to lunch and come back, then times out; the hours
 * worked are time in to time out less lunch. Administrators can also enter or correct a record by hand.
 *
 * @param {Object} deps
 * @param {import("../../domain/attendance/AttendanceRepository").AttendanceRepository} deps.attendanceRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/salary/SalaryRateRepository").SalaryRateRepository} [deps.salaryRateRepository]
 *   without it the rate always comes from the salary
 * @param {{effectiveShift: (employeeId: string, day: string) => Promise<import("../../domain/shift/WorkShift").WorkShift | null>}} [deps.shiftLookup]
 *   without it no shift is recorded and nobody is ever late
 * @param {number} [deps.utcOffsetMinutes] the workplace clock: shifts and the working day are in local time
 * @param {() => Date} [deps.now] the clock; tests pass a fixed one
 */
export const createAttendanceUseCases = ({
  attendanceRepository,
  employeeRepository,
  salaryRateRepository,
  shiftLookup,
  utcOffsetMinutes = 0,
  now = () => new Date(),
}) => {
  const crud = createCrudUseCases({
    repository: attendanceRepository,
    entityName: "Attendance record",
    validate: assertValidAttendance,
    pickFields: (input) => pickAttendanceFields(input, utcOffsetMinutes),
  });

  const dayOf = (instant) => localDay(instant, utcOffsetMinutes);

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

  /**
   * The shift the employee was on the day they timed in and how late they were. Like the rate, this is
   * worked out here and never taken from a request.
   */
  const scheduleFor = async (employeeId, timeIn) => {
    const shift = shiftLookup ? await shiftLookup.effectiveShift(employeeId, dayOf(timeIn)) : null;
    return shift
      ? { shiftId: shift.id, lateMinutes: lateMinutesFor(shift, timeIn, utcOffsetMinutes) }
      : { shiftId: null, lateMinutes: 0 };
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

    /** Administrator enters a whole record. The rate and shift come from what is on file for that day. */
    async addAttendance(input = {}) {
      assertValidAttendance(input);
      const employee = await findActiveEmployee(input.employeeId);
      const day = dayOf(input.timeIn);
      await assertOneRecordPerDay(input.employeeId, day);

      return crud.add({
        ...input,
        hourlyRate: await resolveHourlyRate(employee, day),
        ...(await scheduleFor(input.employeeId, input.timeIn)),
      });
    },

    /**
     * Administrator corrects a record. Fields that are left out keep their stored value, the rate
     * included. The shift and lateness are worked out again only when the employee or time in changes.
     */
    async updateAttendance(id, input = {}) {
      const existing = await crud.get(id);
      const { hourlyRate, shiftId, lateMinutes, ...changes } = input; // none of these may be set by hand
      const merged = { ...Object.fromEntries(TIME_FIELDS.map((field) => [field, existing[field]])), ...changes };

      assertValidAttendance(merged);
      await assertOneRecordPerDay(merged.employeeId, dayOf(merged.timeIn), id);

      const moved =
        merged.employeeId !== existing.employeeId || new Date(merged.timeIn).getTime() !== new Date(existing.timeIn).getTime();
      return crud.update(id, moved ? { ...merged, ...(await scheduleFor(merged.employeeId, merged.timeIn)) } : merged);
    },

    /** Time in: starts the day and records the hourly rate it will be paid at and how late it is. */
    async timeIn(employeeId) {
      const employee = await findActiveEmployee(employeeId);
      const time = now();

      if (await attendanceRepository.findOpenByEmployeeId(employeeId)) {
        throw new InvalidStateError("This employee is already timed in. Time out first.");
      }
      await assertOneRecordPerDay(employeeId, dayOf(time));

      const rate = await resolveHourlyRate(employee, dayOf(time));
      assertValidAttendance({ employeeId, timeIn: time, hourlyRate: rate });
      return crud.add({ employeeId, timeIn: time, hourlyRate: rate, ...(await scheduleFor(employeeId, time)) });
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
