import { createCrudUseCases } from "../shared/crudUseCases.js";
import { EmployeeInUseError, ValidationError } from "../../domain/errors.js";
import { assertValidEmployee, pickEmployeeFields } from "../../domain/employee/employeeRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/leave/LeaveBalanceRepository").LeaveBalanceRepository} deps.leaveBalanceRepository
 * @param {import("../../domain/leave/LeaveRequestRepository").LeaveRequestRepository} deps.leaveRequestRepository
 * @param {import("../ports/PasswordHasher").PasswordHasher} [deps.passwordHasher] hashes portal passwords; without it they are refused
 * @param {import("../../domain/inventory/ItemRepository").ItemRepository} [deps.itemRepository] when given, an employee holding items cannot be deleted
 */
export const createEmployeeUseCases = ({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
  itemRepository,
  passwordHasher,
}) => {
  const crud = createCrudUseCases({
    repository: employeeRepository,
    entityName: "Employee",
    validate: assertValidEmployee,
    pickFields: pickEmployeeFields,
  });

  /** Sets the portal password when one was sent. Blank or missing leaves the current one alone. */
  const storePortalPassword = async (id, portalPassword) => {
    if (portalPassword === undefined || portalPassword === null || portalPassword === "") return;
    if (!passwordHasher) throw new ValidationError("Portal passwords are not enabled");
    await employeeRepository.setPassword(id, await passwordHasher.hash(portalPassword));
  };

  return {
    listEmployees: crud.list,
    listEmployeesPage: crud.listPage,
    employeeSummary: () => employeeRepository.summary(),
    getEmployee: crud.get,

    async addEmployee(input = {}) {
      const employee = await crud.add(input);
      await storePortalPassword(employee.id, input.portalPassword);
      return employee;
    },

    async updateEmployee(id, input = {}) {
      const employee = await crud.update(id, input);
      await storePortalPassword(id, input.portalPassword);
      return employee;
    },

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
