import express from "express";
import { createCrudRouter } from "./crudRouter.js";

/**
 * Payroll: HR only, behind "salary-rates:view" like the hourly rates it is built from.
 *   GET  /payroll?from=YYYY-MM-DD&to=YYYY-MM-DD   gross pay, deductions and net pay for a period
 *   POST /payroll/final-pay/:employeeId           what a leaving employee is still owed (stores nothing)
 */
export const createPayrollRouter = ({ payrollUseCases, requireAuth, requirePermission }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/", requirePermission("salary-rates:view"), async (req, res) => {
    const report = await payrollUseCases.report({ from: req.query.from, to: req.query.to });
    res.status(200).json({ ...report, count: report.data.length });
  });

  router.post("/final-pay/:employeeId", requirePermission("salary-rates:view"), async (req, res) => {
    res.status(200).json(await payrollUseCases.finalPay(req.params.employeeId, req.body ?? {}));
  });

  return router;
};

/** The deductions taken from pay: reading needs "salary-rates:view", changing "salary-rates:assign". */
export const createPayrollDeductionRouter = ({ payrollDeductionUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Deduction",
    useCases: {
      list: payrollDeductionUseCases.listDeductions,
      listPage: payrollDeductionUseCases.listDeductionsPage,
      get: payrollDeductionUseCases.getDeduction,
      add: payrollDeductionUseCases.addDeduction,
      update: payrollDeductionUseCases.updateDeduction,
      remove: payrollDeductionUseCases.deleteDeduction,
    },
  });
};
