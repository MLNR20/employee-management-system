import express from "express";
import { createCrudRouter, toDto } from "./crudRouter.js";

// Routers for roles, role assignments, leave types and the administrator list.
// All require a signed-in administrator.

export const createRoleRouter = ({ roleUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Role",
    useCases: {
      list: roleUseCases.listRoles,
      get: roleUseCases.getRole,
      add: roleUseCases.addRole,
      update: roleUseCases.updateRole,
      remove: roleUseCases.deleteRole,
    },
  });
};

export const createRoleAssignmentRouter = ({ roleAssignmentUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Role assignment",
    operations: ["create", "list", "get", "delete"], // assignments are never edited
    useCases: {
      list: roleAssignmentUseCases.listRoleAssignments,
      get: roleAssignmentUseCases.getRoleAssignment,
      add: roleAssignmentUseCases.assignRole,
      remove: roleAssignmentUseCases.deleteRoleAssignment,
    },
  });
};

export const createLeaveTypeRouter = ({ leaveTypeUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Leave type",
    useCases: {
      list: leaveTypeUseCases.listLeaveTypes,
      get: leaveTypeUseCases.getLeaveType,
      add: leaveTypeUseCases.addLeaveType,
      update: leaveTypeUseCases.updateLeaveType,
      remove: leaveTypeUseCases.deleteLeaveType,
    },
  });
};

export const createLeaveBalanceRouter = ({ leaveBalanceUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  return createCrudRouter({
    router,
    entityName: "Leave balance",
    useCases: {
      list: leaveBalanceUseCases.listLeaveBalances,
      get: leaveBalanceUseCases.getLeaveBalance,
      add: leaveBalanceUseCases.addLeaveBalance,
      update: leaveBalanceUseCases.updateLeaveBalance,
      remove: leaveBalanceUseCases.deleteLeaveBalance,
    },
  });
};

/**
 * Leave requests are filed, then decided: they are never edited or deleted, so
 * only create/list/get are standard routes. The decisions are explicit actions;
 * the approver is always the signed-in administrator, never taken from the body.
 */
export const createLeaveRequestRouter = ({ leaveRequestUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  const decision = (action) => async (req, res) => {
    const request = await leaveRequestUseCases[action](req.params.id, {
      approverId: req.user.id,
      remarks: req.body?.remarks,
    });
    res.status(200).json(toDto(request));
  };

  router.post("/:id/approve", decision("approveLeave"));
  router.post("/:id/reject", decision("rejectLeave"));

  router.post("/:id/cancel", async (req, res) => {
    res.status(200).json(toDto(await leaveRequestUseCases.cancelLeave(req.params.id)));
  });

  router.get("/:id/approvals", async (req, res) => {
    const approvals = await leaveRequestUseCases.listApprovals(req.params.id);
    res.status(200).json({ count: approvals.length, data: approvals.map(toDto) });
  });

  return createCrudRouter({
    router,
    entityName: "Leave request",
    operations: ["create", "list", "get"],
    useCases: {
      list: leaveRequestUseCases.listLeaveRequests,
      get: leaveRequestUseCases.getLeaveRequest,
      add: leaveRequestUseCases.fileLeave,
    },
  });
};

export const createAdministratorListRouter =({ administratorUseCases, requireAuth }) => {
  const router = express.Router();
  router.use(requireAuth);

  router.get("/", async (req, res) => {
    const administrators = await administratorUseCases.listAdministrators();
    res.status(200).json({ count: administrators.length, data: administrators.map(toDto) });
  });

  return router;
};
