import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

/** Work shifts: full CRUD. DELETE is a soft delete, so a deleted shift disappears from every list. */
export const createWorkShiftRouter = ({ workShiftUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Work shift",
    useCases: {
      list: workShiftUseCases.listWorkShifts,
      listPage: workShiftUseCases.listWorkShiftsPage,
      get: workShiftUseCases.getWorkShift,
      add: workShiftUseCases.addWorkShift,
      update: workShiftUseCases.updateWorkShift,
      remove: workShiftUseCases.deleteWorkShift,
    },
  });
};

/**
 * Who works which shift from when. The assigning administrator is always the signed-in one, never
 * taken from the body. Assignments are added and removed, not edited: to move someone, add a new one.
 */
export const createShiftAssignmentRouter = ({ shiftAssignmentUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/employee/:employeeId", async (req, res) => {
    const assignments = await shiftAssignmentUseCases.listForEmployee(req.params.employeeId);
    res.status(200).json({ count: assignments.length, data: assignments.map(toDto) });
  });

  router.post("/", async (req, res) => {
    const assignment = await shiftAssignmentUseCases.assignShift(req.body ?? {}, req.user.id);
    res.status(200).json(toDto(assignment));
  });

  return createCrudRouter({
    router,
    entityName: "Shift assignment",
    operations: ["list", "get", "delete"],
    useCases: {
      list: shiftAssignmentUseCases.listShiftAssignments,
      listPage: shiftAssignmentUseCases.listShiftAssignmentsPage,
      get: shiftAssignmentUseCases.getShiftAssignment,
      remove: shiftAssignmentUseCases.deleteShiftAssignment,
    },
  });
};
