import { Repository } from "../Repository.js";

/**
 * Deleted shifts are invisible to the standard Repository methods (list, page, find, update,
 * summary); only `findByIdIncludingDeleted` can still reach them.
 * @extends {Repository<import("./WorkShift").WorkShift>}
 */
export class WorkShiftRepository extends Repository {
  /** @returns {Promise<import("./WorkShift").WorkShift | null>} a live shift whose name matches, ignoring case */
  async findByName(name) {
    throw new Error("WorkShiftRepository.findByName not implemented");
  }

  /** @returns {Promise<import("./WorkShift").WorkShift | null>} a live shift with this schedule key (see shiftRules) */
  async findByScheduleKey(scheduleKey) {
    throw new Error("WorkShiftRepository.findByScheduleKey not implemented");
  }

  /** @returns {Promise<import("./WorkShift").WorkShift | null>} the shift even when it has been deleted */
  async findByIdIncludingDeleted(id) {
    throw new Error("WorkShiftRepository.findByIdIncludingDeleted not implemented");
  }

  /**
   * Soft delete: marks the shift deleted and frees its name and schedule for reuse.
   * @returns {Promise<boolean>} false when there was no live shift with that id
   */
  async softDelete(id) {
    throw new Error("WorkShiftRepository.softDelete not implemented");
  }
}
