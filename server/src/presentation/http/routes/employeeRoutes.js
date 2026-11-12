import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

// The forms send the active flag as `status` ("true"/"false"); the model calls it `isActive`.
const toEmployeeInput = (body = {}) => {
  const { status, ...fields } = body;
  if (fields.isActive === undefined && status !== undefined) {
    fields.isActive = status === true || status === "true";
  }
  return fields;
};

export const createEmployeeRouter = ({
  employeeUseCases,
  leaveBalanceUseCases,
  leaveRequestUseCases,
  requireAuth,
}) => {
  const router = express.Router();

  router.use(requireAuth);

  // Lets the client ask "who am I?" with its access token. Registered before
  // the CRUD routes so "/protected" is not read as an employee id.
  router.get("/protected", (req, res) => {
    res.json({ message: "Welcome to the protected route!", user: req.user });
  });

  // An employee's leave: what they are entitled to, and what they have filed.
  router.get("/:id/leave-balances", async (req, res) => {
    const balances = await leaveBalanceUseCases.listForEmployee(req.params.id);
    res.status(200).json({ count: balances.length, data: balances.map(toDto) });
  });

  router.get("/:id/leave-requests", async (req, res) => {
    const requests = await leaveRequestUseCases.listForEmployee(req.params.id);
    res.status(200).json({ count: requests.length, data: requests.map(toDto) });
  });

  return createCrudRouter({
    router,
    entityName: "Employee",
    toInput: toEmployeeInput,
    useCases: {
      list: employeeUseCases.listEmployees,
      get: employeeUseCases.getEmployee,
      add: employeeUseCases.addEmployee,
      update: employeeUseCases.updateEmployee,
      remove: employeeUseCases.deleteEmployee,
    },
  });
};
