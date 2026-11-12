import express from "express";
import cors from "cors";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { createEmployeeRouter } from "./routes/employeeRoutes.js";
import { createDepartmentRouter } from "./routes/departmentRoutes.js";
import {
  createAdministratorListRouter,
  createLeaveBalanceRouter,
  createLeaveRequestRouter,
  createLeaveTypeRouter,
  createRoleAssignmentRouter,
  createRoleRouter,
} from "./routes/hrRoutes.js";
import { createAuditLogRouter } from "./routes/auditLogRoutes.js";
import { createInventoryRouter } from "./routes/inventoryRoutes.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { createAuditMiddleware } from "./middleware/auditMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";

/** Builds the Express app from use cases. It owns no state, so tests can pass fakes. */
export const createApp = ({
  authUseCases,
  employeeUseCases,
  departmentUseCases,
  roleUseCases,
  roleAssignmentUseCases,
  leaveTypeUseCases,
  leaveBalanceUseCases,
  leaveRequestUseCases,
  administratorUseCases,
  inventoryUseCases,
  auditLogUseCases, // optional: without it nothing is recorded and /audit-logs is not served
}) => {
  const app = express();
  const requireAuth = createAuthMiddleware(authUseCases);

  app.use(cors());
  app.use(express.json());
  if (auditLogUseCases) app.use(createAuditMiddleware(auditLogUseCases));

  app.use("/admin", createAdminRouter({ authUseCases }));
  app.use(
    "/employees",
    createEmployeeRouter({ employeeUseCases, leaveBalanceUseCases, leaveRequestUseCases, requireAuth })
  );
  app.use("/departments", createDepartmentRouter({ departmentUseCases, requireAuth }));
  app.use("/roles", createRoleRouter({ roleUseCases, requireAuth }));
  app.use("/role-assignments", createRoleAssignmentRouter({ roleAssignmentUseCases, requireAuth }));
  app.use("/leave-types", createLeaveTypeRouter({ leaveTypeUseCases, requireAuth }));
  app.use("/leave-balances", createLeaveBalanceRouter({ leaveBalanceUseCases, requireAuth }));
  app.use("/leave-requests", createLeaveRequestRouter({ leaveRequestUseCases, requireAuth }));
  app.use("/administrators", createAdministratorListRouter({ administratorUseCases, requireAuth }));
  app.use("/inventory", createInventoryRouter({ inventoryUseCases, requireAuth }));
  if (auditLogUseCases) app.use("/audit-logs", createAuditLogRouter({ auditLogUseCases, requireAuth }));

  app.use(errorHandler);

  return app;
};
