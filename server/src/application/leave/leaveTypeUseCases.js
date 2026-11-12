import { createCrudUseCases } from "../shared/crudUseCases.js";
import { LeaveTypeInUseError } from "../../domain/errors.js";
import {
  assertValidLeaveType,
  pickLeaveTypeFields,
} from "../../domain/leave/leaveTypeRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/leave/LeaveTypeRepository").LeaveTypeRepository} deps.leaveTypeRepository
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 */
export const createLeaveTypeUseCases = ({
  leaveTypeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
}) => {
  const crud = createCrudUseCases({
    repository: leaveTypeRepository,
    entityName: "Leave type",
    validate: assertValidLeaveType,
    pickFields: pickLeaveTypeFields,
  });

  return {
    listLeaveTypes: crud.list,
    listLeaveTypesPage: crud.listPage,
    getLeaveType: crud.get,
    addLeaveType: crud.add,
    updateLeaveType: crud.update,

    /** A leave type with balances or filed leave cannot be deleted (mark it inactive instead). */
    async deleteLeaveType(id) {
      const inUse =
        (await leaveBalanceRepository.existsForLeaveType(id)) ||
        (await leaveRequestRepository.existsForLeaveType(id));
      if (inUse) throw new LeaveTypeInUseError();
      return crud.remove(id);
    },
  };
};
