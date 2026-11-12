import { NotFoundError, ValidationError } from "../../domain/errors.js";
import { pickFields } from "../../domain/pickFields.js";
import {
  assertValidAmounts,
  assertValidLeaveBalanceReferences,
} from "../../domain/leave/leaveBalanceRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveTypeRepository").LeaveTypeRepository} deps.leaveTypeRepository
 */
export const createLeaveBalanceUseCases = ({
  leaveBalanceRepository,
  employeeRepository,
  leaveTypeRepository,
}) => {
  const getOrThrow = async (id) => {
    const balance = await leaveBalanceRepository.findById(id);
    if (!balance) throw new NotFoundError("Leave balance not found");
    return balance;
  };

  return {
    listLeaveBalances: () => leaveBalanceRepository.findAll(),

    getLeaveBalance: getOrThrow,

    /** All balances of one employee. */
    async listForEmployee(employeeId) {
      if (!(await employeeRepository.findById(employeeId))) {
        throw new NotFoundError("Employee not found");
      }
      return leaveBalanceRepository.findByEmployeeId(employeeId);
    },

    /** Gives an employee a balance for a leave type. availableLeaves defaults to maxLeaves. */
    async addLeaveBalance(input = {}) {
      assertValidLeaveBalanceReferences(input);

      const amounts = {
        maxLeaves: input.maxLeaves,
        availableLeaves: input.availableLeaves ?? input.maxLeaves,
      };
      assertValidAmounts(amounts);

      if (!(await employeeRepository.findById(input.employeeId))) {
        throw new ValidationError("That employee does not exist");
      }
      if (!(await leaveTypeRepository.findById(input.leaveTypeId))) {
        throw new ValidationError("That leave type does not exist");
      }

      return leaveBalanceRepository.create({
        ...pickFields(input, ["employeeId", "leaveTypeId", "isActive"]),
        ...amounts,
      });
    },

    /**
     * Changes the amounts (and active flag). The employee and leave type of a
     * balance are fixed; to move a balance, delete it and add another.
     */
    async updateLeaveBalance(id, input = {}) {
      const existing = await getOrThrow(id);

      const amounts = {
        maxLeaves: input.maxLeaves ?? existing.maxLeaves,
        availableLeaves: input.availableLeaves ?? existing.availableLeaves,
      };
      assertValidAmounts(amounts);

      return leaveBalanceRepository.update(id, {
        ...amounts,
        ...pickFields(input, ["isActive"]),
      });
    },

    async deleteLeaveBalance(id) {
      const removed = await leaveBalanceRepository.remove(id);
      if (!removed) throw new NotFoundError("Leave balance not found");
    },
  };
};
