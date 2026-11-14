import { createCrudUseCases } from "../shared/crudUseCases.js";
import { EmployeeInUseError, NotFoundError, ValidationError } from "../../domain/errors.js";
import { isMissing } from "../../domain/pickFields.js";
import { assertValidEmployee, pickEmployeeFields } from "../../domain/employee/employeeRules.js";

// A reporting line longer than this is not a real org chart: the limit only stops a loop in
// corrupt data from walking forever.
const MAX_REPORTING_DEPTH = 100;

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

  /**
   * Checks a manager that was sent with an employee. A blank one (no manager) is always fine. Otherwise
   * the manager must be an active employee other than this one, and must not already report to this
   * employee, directly or through others, because that would make the reporting line a loop.
   * `employeeId` is undefined while adding, when neither of those cases can happen yet.
   */
  const assertValidManager = async (employeeId, managerId) => {
    if (isMissing(managerId)) return;

    if (managerId === employeeId) throw new ValidationError("An employee cannot be their own manager");

    const manager = await employeeRepository.findById(managerId);
    if (!manager) throw new ValidationError("That manager does not exist");
    if (manager.isActive === false) throw new ValidationError("An inactive employee cannot be a manager");
    if (employeeId === undefined) return;

    // Walk up from the new manager. Meeting this employee on the way means they would end up managing themselves.
    const visited = new Set();
    let boss = manager;
    while (boss?.managerId && !visited.has(boss.id) && visited.size < MAX_REPORTING_DEPTH) {
      if (boss.managerId === employeeId) {
        throw new ValidationError(
          `${manager.first_name} ${manager.last_name} already reports to this employee, so they cannot be their manager`
        );
      }
      visited.add(boss.id);
      boss = await employeeRepository.findById(boss.managerId);
    }
  };

  return {
    listEmployees: crud.list,
    listEmployeesPage: crud.listPage,
    employeeSummary: () => employeeRepository.summary(),
    getEmployee: crud.get,

    async addEmployee(input = {}) {
      assertValidEmployee(input);
      await assertValidManager(undefined, input.managerId);

      const employee = await crud.add(input);
      await storePortalPassword(employee.id, input.portalPassword);
      return employee;
    },

    async updateEmployee(id, input = {}) {
      assertValidEmployee(input);
      // Only a manager that was sent is checked: leaving the field out keeps the current one.
      await assertValidManager(id, input.managerId);

      const employee = await crud.update(id, input);
      await storePortalPassword(id, input.portalPassword);
      return employee;
    },

    /** The employees who report directly to this one. */
    async listDirectReports(id) {
      if (!(await employeeRepository.findById(id))) throw new NotFoundError("Employee not found");
      return employeeRepository.findByManagerId(id);
    },

    /**
     * An employee with filed leave keeps that history, one who still holds inventory items must return
     * them, and one who manages others must have those people moved to another manager first, so none
     * of them can be deleted (mark them inactive instead). Their unused leave balances are deleted with them.
     */
    async deleteEmployee(id) {
      const history = await leaveRequestRepository.findByEmployeeId(id);
      if (history.length > 0) throw new EmployeeInUseError();
      if (itemRepository && (await itemRepository.existsForEmployee(id))) {
        throw new EmployeeInUseError("This employee still holds inventory items; take them back first");
      }
      if (await employeeRepository.existsWithManager(id)) {
        throw new EmployeeInUseError("This employee manages other employees; give them another manager first");
      }

      await crud.remove(id);
      await leaveBalanceRepository.removeForEmployee(id);
    },
  };
};
