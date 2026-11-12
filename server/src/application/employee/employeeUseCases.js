import { createCrudUseCases } from "../shared/crudUseCases.js";
import { EmployeeInUseError } from "../../domain/errors.js";
import { assertValidEmployee, pickEmployeeFields } from "../../domain/employee/employeeRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 * @param {import("../../domain/inventory/ItemRepository").ItemRepository} [deps.itemRepository] when given, an employee holding items cannot be deleted
 */
export const createEmployeeUseCases = ({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
  itemRepository,
}) => {
  const crud = createCrudUseCases({
    repository: employeeRepository,
    entityName: "Employee",
    validate: assertValidEmployee,
    pickFields: pickEmployeeFields,
  });

  return {
    listEmployees: crud.list,
    listEmployeesPage: crud.listPage,
    employeeSummary: () => employeeRepository.summary(),
    getEmployee: crud.get,
    addEmployee: crud.add,
    updateEmployee: crud.update,

    /**
     * An employee with filed leave keeps that history, and one who still holds inventory items
     * must return them, so neither can be deleted (mark them inactive instead). Their unused leave balances are deleted with them.
     */
    async deleteEmployee(id) {
      const history = await leaveRequestRepository.findByEmployeeId(id);
      if (history.length > 0) throw new EmployeeInUseError();
      if (itemRepository && (await itemRepository.existsForEmployee(id))) {
        throw new EmployeeInUseError("This employee still holds inventory items; take them back first");
      }

      await crud.remove(id);
      await leaveBalanceRepository.removeForEmployee(id);
    },
  };
};
