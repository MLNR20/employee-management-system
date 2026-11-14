import { createCrudUseCases } from "../shared/crudUseCases.js";
import { NotFoundError } from "../../domain/errors.js";
import { isMissing } from "../../domain/pickFields.js";
import { toDay } from "../../domain/dashboard/attendance.js";
import { assertValidSalaryRate, pickSalaryRateFields } from "../../domain/salary/salaryRateRules.js";

/**
 * Hourly rates assigned to employees. The use cases do not check who is asking: the HTTP layer only
 * routes HR here (the "salary-rates" permissions). An assignment is never edited or deleted, so the
 * history of what each employee was paid per hour stays intact.
 *
 * @param {Object} deps
 * @param {import("../../domain/salary/SalaryRateRepository").SalaryRateRepository} deps.salaryRateRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {() => Date} [deps.now]
 */
export const createSalaryRateUseCases = ({ salaryRateRepository, employeeRepository, now = () => new Date() }) => {
  const crud = createCrudUseCases({
    repository: salaryRateRepository,
    entityName: "Salary rate",
    validate: assertValidSalaryRate,
    pickFields: pickSalaryRateFields,
  });

  return {
    listSalaryRates: crud.list,
    listSalaryRatesPage: crud.listPage,
    getSalaryRate: crud.get,

    /** Assigns a rate to an employee from `effectiveFrom` (today when left out), recording who did it. */
    async assignRate(input = {}, assignedBy) {
      assertValidSalaryRate(input);

      const employee = await employeeRepository.findById(input.employeeId);
      if (!employee || employee.isActive === false) throw new NotFoundError("Employee not found");

      return crud.add({
        ...input,
        effectiveFrom: isMissing(input.effectiveFrom) ? toDay(now()) : input.effectiveFrom,
        assignedBy,
      });
    },

    /** One employee's rates, newest first. */
    async listForEmployee(employeeId) {
      return salaryRateRepository.findByEmployeeId(employeeId);
    },

    /** The rate in force for the employee on a "YYYY-MM-DD" day, or null when none was assigned. */
    async effectiveRate(employeeId, day) {
      return salaryRateRepository.findEffective(employeeId, day);
    },
  };
};
