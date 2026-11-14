import { createCrudUseCases } from "../shared/crudUseCases.js";
import { NotFoundError, ValidationError } from "../../domain/errors.js";
import { isMissing } from "../../domain/pickFields.js";
import { localDay } from "../../domain/attendance/localTime.js";
import {
  assertValidShiftAssignment,
  pickShiftAssignmentFields,
} from "../../domain/shift/shiftAssignmentRules.js";

/**
 * The shift an employee works from a day on. Moving someone is a new assignment with a later date;
 * the shift on any day is the latest assignment that started on or before it.
 *
 * @param {Object} deps
 * @param {import("../../domain/shift/ShiftAssignmentRepository").ShiftAssignmentRepository} deps.shiftAssignmentRepository
 * @param {import("../../domain/shift/WorkShiftRepository").WorkShiftRepository} deps.workShiftRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {number} [deps.utcOffsetMinutes] the workplace clock, used for "today"
 * @param {() => Date} [deps.now]
 */
export const createShiftAssignmentUseCases = ({
  shiftAssignmentRepository,
  workShiftRepository,
  employeeRepository,
  utcOffsetMinutes = 0,
  now = () => new Date(),
}) => {
  const crud = createCrudUseCases({
    repository: shiftAssignmentRepository,
    entityName: "Shift assignment",
    validate: assertValidShiftAssignment,
    pickFields: pickShiftAssignmentFields,
  });

  return {
    listShiftAssignments: crud.list,
    listShiftAssignmentsPage: crud.listPage,
    getShiftAssignment: crud.get,
    deleteShiftAssignment: crud.remove,

    /** Puts an employee on a shift from `effectiveFrom` (today when left out), recording who did it. */
    async assignShift(input = {}, assignedBy) {
      assertValidShiftAssignment(input);

      const employee = await employeeRepository.findById(input.employeeId);
      if (!employee || employee.isActive === false) throw new NotFoundError("Employee not found");

      // A deleted shift cannot be given to anyone new.
      if (!(await workShiftRepository.findById(input.shiftId))) {
        throw new ValidationError("That work shift does not exist");
      }

      return crud.add({
        ...input,
        effectiveFrom: isMissing(input.effectiveFrom) ? localDay(now(), utcOffsetMinutes) : input.effectiveFrom,
        assignedBy,
      });
    },

    /** One employee's shifts, newest first. */
    listForEmployee: (employeeId) => shiftAssignmentRepository.findByEmployeeId(employeeId),

    /**
     * The shift an employee works on a "YYYY-MM-DD" day, or null when none is assigned. A shift that
     * has since been deleted still counts: that is how the day was scheduled.
     */
    async effectiveShift(employeeId, day) {
      const assignment = await shiftAssignmentRepository.findEffective(employeeId, day);
      return assignment ? workShiftRepository.findByIdIncludingDeleted(assignment.shiftId) : null;
    },
  };
};
