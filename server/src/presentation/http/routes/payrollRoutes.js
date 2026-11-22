import express from "express";

/**
 * The payroll report: HR only, behind "salary-rates:view" like the hourly rates it is built from.
 * GET /payroll?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
export const createPayrollRouter = ({ payrollUseCases, requireAuth, requirePermission }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/", requirePermission("salary-rates:view"), async (req, res) => {
    const report = await payrollUseCases.report({ from: req.query.from, to: req.query.to });
    res.status(200).json({ ...report, count: report.data.length });
  });

  return router;
};
