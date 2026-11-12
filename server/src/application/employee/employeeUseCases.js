import { createCrudUseCases } from "../shared/crudUseCases.js";
import { EmployeeInUseError } from "../../domain/errors.js";
import { assertValidEmployee, pickEmployeeFields } from "../../domain/employee/employeeRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 */
export const createEmployeeUseCases = ({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
}) => {
  const crud = createCrudUseCases({
    repository: employeeRepository,
    entityName: "Employee",
    validate: assertValidEmployee,
    pickFields: pickEmployeeFields,
  });

  return {
    listEmployees: crud.list,
    getEmployee: crud.get,
    addEmployee: crud.add,
    updateEmployee: crud.update,

    /**
     * An employee with filed leave keeps that history, so they cannot be deleted
     * (mark them inactive instead). Their unused leave balances are deleted with them.
     */
    async deleteEmployee(id) {
      const history = await leaveRequestRepository.findByEmployeeId(id);
      if (history.length > 0) throw new EmployeeInUseError();

      await crud.remove(id);
      await leaveBalanceRepository.removeForEmployee(id);
    },
  };
};
