import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

/**
 * Hourly rates assigned to employees: HR only. Reading needs "salary-rates:view" and assigning
 * needs "salary-rates:assign". Assignments are never edited or deleted, and the assigning
 * administrator is always the signed-in one, never taken from the body.
 */
export const createSalaryRateRouter = ({ salaryRateUseCases, requireAuth, requirePermission }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/employee/:employeeId", requirePermission("salary-rates:view"), async (req, res) => {
    const rates = await salaryRateUseCases.listForEmployee(req.params.employeeId);
    res.status(200).json({ count: rates.length, data: rates.map(toDto) });
  });

  router.post("/", requirePermission("salary-rates:assign"), async (req, res) => {
    const rate = await salaryRateUseCases.assignRate(req.body ?? {}, req.user.id);
    res.status(200).json(toDto(rate));
  });

  router.get(["/", "/:id"], requirePermission("salary-rates:view")); // guards the list and get routes below

  return createCrudRouter({
    router,
    entityName: "Salary rate",
    operations: ["list", "get"], // creating is handled above, with the HR check
    useCases: {
      list: salaryRateUseCases.listSalaryRates,
      listPage: salaryRateUseCases.listSalaryRatesPage,
      get: salaryRateUseCases.getSalaryRate,
    },
  });
};
