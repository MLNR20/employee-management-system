import { createCrudUseCases } from "../shared/crudUseCases.js";
import { DuplicateShiftError, NotFoundError } from "../../domain/errors.js";
import { assertValidShift, pickShiftFields, scheduleKey } from "../../domain/shift/shiftRules.js";

const FIELDS = ["name", "startTime", "endTime", "lunchMinutes", "graceMinutes", "workDays"];

/**
 * Work shifts. Every shift is unique: no two live shifts share a name (ignoring case) or the same
 * hours, lunch and weekdays. Deleting is a soft delete: the shift leaves every list and can no longer
 * be assigned, its name and schedule become free again, and past assignments and attendance keep
 * pointing at it.
 *
 * @param {Object} deps
 * @param {import("../../domain/shift/WorkShiftRepository").WorkShiftRepository} deps.workShiftRepository
 */
export const createWorkShiftUseCases = ({ workShiftRepository }) => {
  const crud = createCrudUseCases({
    repository: workShiftRepository,
    entityName: "Work shift",
    validate: assertValidShift,
    pickFields: pickShiftFields,
  });

  const assertUnique = async (shift, exceptId) => {
    const sameName = await workShiftRepository.findByName(shift.name);
    if (sameName && sameName.id !== exceptId) {
      throw new DuplicateShiftError(`A work shift named "${sameName.name}" already exists`);
    }

    const sameSchedule = await workShiftRepository.findByScheduleKey(scheduleKey(shift));
    if (sameSchedule && sameSchedule.id !== exceptId) {
      throw new DuplicateShiftError(`"${sameSchedule.name}" already has these hours, lunch and weekdays`);
    }
  };

  return {
    listWorkShifts: crud.list,
    listWorkShiftsPage: crud.listPage,
    getWorkShift: crud.get,

    async addWorkShift(input = {}) {
      assertValidShift(input);
      await assertUnique(pickShiftFields(input));
      return crud.add(input);
    },

    /** Fields that are left out keep their stored value. */
    async updateWorkShift(id, input = {}) {
      const existing = await crud.get(id);
      const merged = { ...Object.fromEntries(FIELDS.map((field) => [field, existing[field]])), ...input };

      assertValidShift(merged);
      await assertUnique(pickShiftFields(merged), id);
      return crud.update(id, merged);
    },

    /** Soft delete. A shift that is already deleted (or never existed) is reported as not found. */
    async deleteWorkShift(id) {
      if (!(await workShiftRepository.softDelete(id))) throw new NotFoundError("Work shift not found");
    },
  };
};
