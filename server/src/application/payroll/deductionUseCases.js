import { createCrudUseCases } from "../shared/crudUseCases.js";
import { assertValidDeduction, pickDeductionFields } from "../../domain/payroll/deductionRules.js";

/**
 * The deductions HR takes from pay. Every name is unique. The HTTP layer decides who may manage them.
 *
 * @param {Object} deps
 * @param {import("../../domain/Repository").Repository} deps.payrollDeductionRepository
 */
export const createPayrollDeductionUseCases = ({ payrollDeductionRepository }) => {
  const crud = createCrudUseCases({
    repository: payrollDeductionRepository,
    entityName: "Deduction",
    validate: assertValidDeduction,
    pickFields: pickDeductionFields,
  });

  return {
    listDeductions: crud.list,
    listDeductionsPage: crud.listPage,
    getDeduction: crud.get,
    addDeduction: crud.add,
    updateDeduction: crud.update,
    deleteDeduction: crud.remove,
  };
};
