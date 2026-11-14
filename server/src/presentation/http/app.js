import express from "express";
import cors from "cors";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { createEmployeeRouter } from "./routes/employeeRoutes.js";
import { createDepartmentRouter } from "./routes/departmentRoutes.js";
import { createAttendanceRouter } from "./routes/attendanceRoutes.js";
import { createSalaryRateRouter } from "./routes/salaryRateRoutes.js";
import { createWorkShiftRouter, createShiftAssignmentRouter } from "./routes/shiftRoutes.js";
import { createDocumentRequirementRouter, createEmployeeDocumentRouter } from "./routes/documentRoutes.js";
import { createRequirePermission } from "./middleware/permissionMiddleware.js";
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
import { createDashboardRouter } from "./routes/dashboardRoutes.js";
import { createEmployeeAuthRouter, createEmployeePortalRouter } from "./routes/employeePortalRoutes.js";
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
  dashboardUseCases,
  borrowingUseCases, // used by the employee portal
  employeeAuthUseCases, // optional: without it the employee portal is not served
  auditLogUseCases, // optional: without it nothing is recorded and /audit-logs is not served
  attendanceUseCases, // optional: without it /attendance is not served
  salaryRateUseCases, // optional, with authorizationUseCases: without both /salary-rates is not served
  authorizationUseCases,
  workShiftUseCases, // optional: without it /work-shifts is not served
  shiftAssignmentUseCases, // optional: without it /shift-assignments is not served
  documentRequirementUseCases, // optional: without it /document-requirements is not served
  employeeDocumentUseCases, // optional: without it /employee-documents is not served
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
  if (attendanceUseCases) app.use("/attendance", createAttendanceRouter({ attendanceUseCases, requireAuth }));
  if (workShiftUseCases) app.use("/work-shifts", createWorkShiftRouter({ workShiftUseCases, requireAuth }));
  if (shiftAssignmentUseCases) {
    app.use("/shift-assignments", createShiftAssignmentRouter({ shiftAssignmentUseCases, requireAuth }));
  }
  if (documentRequirementUseCases) {
    app.use("/document-requirements", createDocumentRequirementRouter({ documentRequirementUseCases, requireAuth }));
  }
  if (employeeDocumentUseCases) {
    app.use("/employee-documents", createEmployeeDocumentRouter({ employeeDocumentUseCases, requireAuth }));
  }
  if (salaryRateUseCases && authorizationUseCases) {
    const requirePermission = createRequirePermission(authorizationUseCases);
    app.use("/salary-rates", createSalaryRateRouter({ salaryRateUseCases, requireAuth, requirePermission }));
  }
  app.use("/departments", createDepartmentRouter({ departmentUseCases, requireAuth }));
  app.use("/roles", createRoleRouter({ roleUseCases, requireAuth }));
  app.use("/role-assignments", createRoleAssignmentRouter({ roleAssignmentUseCases, requireAuth }));
  app.use("/leave-types", createLeaveTypeRouter({ leaveTypeUseCases, requireAuth }));
  app.use("/leave-balances", createLeaveBalanceRouter({ leaveBalanceUseCases, requireAuth }));
  app.use("/leave-requests", createLeaveRequestRouter({ leaveRequestUseCases, requireAuth }));
  app.use("/administrators", createAdministratorListRouter({ administratorUseCases, requireAuth }));
  if (employeeAuthUseCases) {
    const requireEmployeeAuth = createAuthMiddleware(employeeAuthUseCases);
    app.use("/employee-auth", createEmployeeAuthRouter({ employeeAuthUseCases }));
    app.use(
      "/employee-portal",
      createEmployeePortalRouter({
        employeeUseCases,
        leaveTypeUseCases,
        leaveBalanceUseCases,
        leaveRequestUseCases,
        borrowingUseCases,
        requireEmployeeAuth,
      })
    );
  }
  app.use("/inventory", createInventoryRouter({ inventoryUseCases, requireAuth }));
  app.use("/dashboard", createDashboardRouter({ dashboardUseCases, requireAuth }));
  if (auditLogUseCases) app.use("/audit-logs", createAuditLogRouter({ auditLogUseCases, requireAuth }));

  app.use(errorHandler);

  return app;
};
