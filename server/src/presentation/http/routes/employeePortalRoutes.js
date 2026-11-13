import express from "express";
import { toDto } from "./crudRouter.js";

/** POST /employee-auth/login: email and portal password in, an employee access token out. */
export const createEmployeeAuthRouter = ({ employeeAuthUseCases }) => {
  const router = express.Router();

  router.post("/login", async (req, res) => {
    const { accessToken } = await employeeAuthUseCases.login(req.body);
    res.status(200).json({ message: "Login successful", token: accessToken });
  });

  return router;
};

/** What the signed-in employee may see about themselves. Everything here needs an employee token. */
export const createEmployeePortalRouter = ({
  employeeUseCases,
  leaveTypeUseCases,
  leaveBalanceUseCases,
  leaveRequestUseCases,
  borrowingUseCases,
  requireEmployeeAuth,
}) => {
  const router = express.Router();
  router.use(requireEmployeeAuth);

  router.get("/me", async (req, res) => {
    const employee = await employeeUseCases.getEmployee(req.user.id);
    const { id, first_name, last_name, email, position, department } = employee;
    res.status(200).json({ _id: id, first_name, last_name, email, position, department });
  });

  const list = (items) => ({ count: items.length, data: items.map(toDto) });

  // Leave. The employee is always the signed-in one: ids in the body or the URL never pick someone else.
  router.get("/leave-types", async (req, res) => {
    const types = await leaveTypeUseCases.listLeaveTypes();
    res.status(200).json(list(types.filter((type) => type.isActive !== false)));
  });

  router.get("/leave-balances", async (req, res) => {
    res.status(200).json(list(await leaveBalanceUseCases.listForEmployee(req.user.id)));
  });

  router.get("/leave-requests", async (req, res) => {
    res.status(200).json(list(await leaveRequestUseCases.listForEmployee(req.user.id)));
  });

  router.post("/leave-requests", async (req, res) => {
    const { leaveTypeId, startDate, endDate, reason } = req.body ?? {};
    const request = await leaveRequestUseCases.fileLeave({
      employeeId: req.user.id,
      leaveTypeId,
      startDate,
      endDate,
      reason,
    });
    res.status(200).json(toDto(request));
  });

  router.post("/leave-requests/:id/cancel", async (req, res) => {
    res.status(200).json(toDto(await leaveRequestUseCases.cancelOwnLeave(req.params.id, req.user.id)));
  });

  // Equipment. Employees only see what they may borrow and what they hold, and only these fields:
  // never the cost, notes or who else holds what.
  const equipmentDto = ({ id, name, serialNumber, category, location, status }) => ({
    _id: id,
    name,
    serialNumber,
    category,
    location,
    status,
  });

  router.get("/equipment", async (req, res) => {
    const { available, borrowed } = await borrowingUseCases.listForEmployee(req.user.id);
    res.status(200).json({ available: available.map(equipmentDto), borrowed: borrowed.map(equipmentDto) });
  });

  router.get("/borrowings", async (req, res) => {
    res.status(200).json(list(await borrowingUseCases.listHistory(req.user.id)));
  });

  router.post("/equipment/:id/borrow", async (req, res) => {
    res.status(200).json(equipmentDto(await borrowingUseCases.borrow(req.user.id, req.params.id)));
  });

  router.post("/equipment/:id/return", async (req, res) => {
    res.status(200).json(equipmentDto(await borrowingUseCases.giveBack(req.user.id, req.params.id)));
  });

  return router;
};
