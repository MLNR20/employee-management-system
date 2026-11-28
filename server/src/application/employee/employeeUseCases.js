import { createCrudUseCases } from "../shared/crudUseCases.js";
import { EmployeeInUseError, InvalidStateError, NotFoundError, ValidationError } from "../../domain/errors.js";
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
 * @param {import("../../domain/employee/EmergencyContactRepository").EmergencyContactRepository} [deps.emergencyContactRepository] when given, an employee's emergency contacts are deleted with them
 * @param {import("../../domain/employmentType/EmploymentTypeRepository").EmploymentTypeRepository} [deps.employmentTypeRepository] when given, an employment type sent with an employee must exist and be active
 * @param {import("../../domain/attendance/AttendanceRepository").AttendanceRepository} [deps.attendanceRepository] when given, an employee with attendance cannot be deleted
 * @param {import("../../domain/salary/SalaryRateRepository").SalaryRateRepository} [deps.salaryRateRepository] when given, an employee with pay rates cannot be deleted
 * @param {import("../../domain/inventory/BorrowingRepository").BorrowingRepository} [deps.borrowingRepository] when given, an employee who has borrowed equipment cannot be deleted
 * @param {Array<{removeForEmployee: (id: string) => Promise<unknown>} | undefined>} [deps.employeeRecords]
 *   other records that only describe an employee (documents, schedule...), deleted along with them
 */
export const createEmployeeUseCases = ({
  employeeRepository,
  leaveBalanceRepository,
  leaveRequestRepository,
  itemRepository,
  emergencyContactRepository,
  employmentTypeRepository,
  attendanceRepository,
  salaryRateRepository,
  borrowingRepository,
  employeeRecords = [],
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

  /**
   * Checks an employment type that was sent with an employee. A blank one (none) is always fine.
   * Otherwise it must exist (not deleted) and be active, unless the employee already holds it: an
   * employee keeps a type that was later marked inactive or deleted.
   */
  const assertValidEmploymentType = async (employeeId, employmentTypeId) => {
    if (isMissing(employmentTypeId) || !employmentTypeRepository) return;

    const holdsIt =
      employeeId !== undefined && (await employeeRepository.findById(employeeId))?.employmentTypeId === employmentTypeId;

    const employmentType = await employmentTypeRepository.findById(employmentTypeId);
    if (!employmentType) {
      if (holdsIt && (await employmentTypeRepository.findByIdIncludingDeleted(employmentTypeId))) return;
      throw new ValidationError("That employment type does not exist");
    }
    if (employmentType.isActive === false && !holdsIt) {
      throw new ValidationError("An inactive employment type cannot be assigned");
    }
  };

  /**
   * A non-rehireable former employee must not come back as a "new" record: no other record may be given
   * one of their government ID numbers. `employeeId` is undefined while adding.
   */
  const assertNotNonRehireable = async (employeeId, input) => {
    const matches = await employeeRepository.findNonRehireableByGovernmentIds(pickEmployeeFields(input));
    if (matches.some((match) => match.id !== employeeId)) {
      throw new InvalidStateError("A government ID number here belongs to a former employee tagged non-rehireable");
    }
  };

  /**
   * The general edit form cannot take an employee in or out of the company: leaving goes through
   * offboarding, so that everyone who leaves is tagged, and coming back goes through rehiring.
   */
  const assertStatusChangeAllowed = async (employeeId, isActive) => {
    if (isActive === undefined) return;
    const employee = await employeeRepository.findById(employeeId);
    if (!employee) return; // the update itself reports it as not found

    const wantsActive = String(isActive) === "true";
    const isNowActive = employee.isActive !== false;
    if (isNowActive && !wantsActive) {
      throw new InvalidStateError(
        "Offboard this employee to deactivate them. That is where they are tagged rehireable or non-rehireable."
      );
    }
    if (!isNowActive && wantsActive && employee.separation) {
      throw new InvalidStateError("This employee was offboarded. Use Rehire on the Offboarding page.");
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
      await assertValidEmploymentType(undefined, input.employmentTypeId);
      await assertNotNonRehireable(undefined, input);

      const employee = await crud.add(input);
      await storePortalPassword(employee.id, input.portalPassword);
      return employee;
    },

    async updateEmployee(id, input = {}) {
      assertValidEmployee(input);
      // Only a manager that was sent is checked: leaving the field out keeps the current one.
      await assertValidManager(id, input.managerId);
      await assertValidEmploymentType(id, input.employmentTypeId);
      await assertStatusChangeAllowed(id, input.isActive);
      await assertNotNonRehireable(id, input);

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
     * Deleting is for a record made by mistake. An employee with filed leave, attendance, pay rates,
     * equipment borrowing or an offboarding keeps that history, one who still holds inventory items must
     * return them, and one who manages others must have those people moved to another manager first, so
     * none of them can be deleted (offboard them instead). Everything else recorded about them (leave
     * balances, emergency contacts and `employeeRecords`) is deleted with them.
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
      const employee = await employeeRepository.findById(id);
      if (employee?.separation || employee?.separationHistory?.length) {
        throw new EmployeeInUseError("This employee has an offboarding record, which must be kept. They cannot be deleted.");
      }
      const kept = [
        [attendanceRepository && (() => attendanceRepository.findByEmployeeId(id, 1)), "attendance records, which payroll depends on"],
        [salaryRateRepository && (() => salaryRateRepository.findByEmployeeId(id)), "a pay rate history"],
        [borrowingRepository && (() => borrowingRepository.findByEmployeeId(id)), "an equipment borrowing history"],
      ];
      for (const [find, what] of kept) {
        if (find && (await find()).length > 0) {
          throw new EmployeeInUseError(`This employee has ${what}. Offboard them instead of deleting.`);
        }
      }

      await crud.remove(id);
      await leaveBalanceRepository.removeForEmployee(id);
      await emergencyContactRepository?.removeForEmployee(id);
      for (const records of employeeRecords) await records?.removeForEmployee(id);
    },
  };
};
