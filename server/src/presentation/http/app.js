import express from "express";
import cors from "cors";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { createEmployeeRouter } from "./routes/employeeRoutes.js";
import { createDepartmentRouter } from "./routes/departmentRoutes.js";
import { createEmergencyContactRouter } from "./routes/emergencyContactRoutes.js";
import { createAttendanceRouter } from "./routes/attendanceRoutes.js";
import { createSalaryRateRouter } from "./routes/salaryRateRoutes.js";
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
import { createJobApplicationRouter, createJobRouter } from "./routes/jobRoutes.js";
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
  emergencyContactUseCases, // optional: without it /emergency-contacts is not served
  attendanceUseCases, // optional: without it /attendance is not served
  salaryRateUseCases, // optional, with authorizationUseCases: without both /salary-rates is not served
  authorizationUseCases,
  jobUseCases, // optional: without it /jobs is not served
  jobApplicationUseCases, // optional, with jobUseCases: without both /job-applications and the portal job routes are not served
  getHealth = () => ({}), // optional: extra fields for GET /health, e.g. the database state
}) => {
  const app = express();
  const requireAuth = createAuthMiddleware(authUseCases);

  // Liveness ping for Render and uptime monitors. Always 200 while the process is up: it must not depend
  // on MongoDB, or a slow database would make the platform restart a healthy server.
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()), ...getHealth() });
  });

  app.use(cors());
  app.use(express.json());
  if (auditLogUseCases) app.use(createAuditMiddleware(auditLogUseCases));

  app.use("/admin", createAdminRouter({ authUseCases }));
  app.use(
    "/employees",
    createEmployeeRouter({
      employeeUseCases,
      leaveBalanceUseCases,
      leaveRequestUseCases,
      emergencyContactUseCases,
      requireAuth,
    })
  );
  if (emergencyContactUseCases) {
    app.use("/emergency-contacts", createEmergencyContactRouter({ emergencyContactUseCases, requireAuth }));
  }
  if (attendanceUseCases) {
    // Hourly rates are HR-only; without the authorization use cases nobody gets to see them.
    const canViewRates = authorizationUseCases
      ? (req) => authorizationUseCases.hasPermission(req.user?.id, "salary-rates:view")
      : undefined;
    app.use("/attendance", createAttendanceRouter({ attendanceUseCases, requireAuth, canViewRates }));
  }
  if (salaryRateUseCases && authorizationUseCases) {
    const requirePermission = createRequirePermission(authorizationUseCases);
    app.use("/salary-rates", createSalaryRateRouter({ salaryRateUseCases, requireAuth, requirePermission }));
  }
  app.use("/departments", createDepartmentRouter({ departmentUseCases, requireAuth }));
  app.use("/roles", createRoleRouter({ roleUseCases, requireAuth, authorizationUseCases }));
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
        jobUseCases,
        jobApplicationUseCases,
        requireEmployeeAuth,
      })
    );
  }
  app.use("/inventory", createInventoryRouter({ inventoryUseCases, requireAuth }));
  if (jobUseCases) app.use("/jobs", createJobRouter({ jobUseCases, requireAuth }));
  if (jobUseCases && jobApplicationUseCases) {
    app.use("/job-applications", createJobApplicationRouter({ jobApplicationUseCases, requireAuth }));
  }
  app.use("/dashboard", createDashboardRouter({ dashboardUseCases, requireAuth }));
  if (auditLogUseCases) app.use("/audit-logs", createAuditLogRouter({ auditLogUseCases, requireAuth }));

  app.use(errorHandler);

  return app;
};
