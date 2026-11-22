import express from "express";
import { createAdminRouter } from "./routes/adminRoutes.js";
import { createEmployeeRouter } from "./routes/employeeRoutes.js";
import { createEmergencyContactRouter } from "./routes/emergencyContactRoutes.js";
import { createJobApplicationRouter, createJobRouter } from "./routes/jobRoutes.js";
import { createDepartmentRouter } from "./routes/departmentRoutes.js";
import { createEmploymentTypeRouter } from "./routes/employmentTypeRoutes.js";
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
import { createNotificationRouter } from "./routes/notificationRoutes.js";
import { createInventoryRouter } from "./routes/inventoryRoutes.js";
import { createDashboardRouter } from "./routes/dashboardRoutes.js";
import { createEmployeeAuthRouter, createEmployeePortalRouter } from "./routes/employeePortalRoutes.js";
import { createAuthMiddleware } from "./middleware/authMiddleware.js";
import { createAuditMiddleware } from "./middleware/auditMiddleware.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { createCorsMiddleware } from "./middleware/corsMiddleware.js";
import { createApiRateLimiter, createAuthRateLimiter } from "./middleware/rateLimitMiddleware.js";

// Endpoints an attacker can hammer to guess credentials or tokens; they get the stricter limit.
const AUTH_ATTEMPT_PATHS = ["/admin/login", "/admin/register", "/admin/refresh", "/employee-auth/login"];

/** Builds the Express app from use cases. It owns no state, so tests can pass fakes. */
export const createApp = ({
  authUseCases,
  employeeUseCases,
  departmentUseCases,
  employmentTypeUseCases, // optional: without it /employment-types is not served
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
  notificationUseCases, // optional: without it /notifications is not served
  emergencyContactUseCases, // optional: without it /emergency-contacts is not served
  attendanceUseCases, // optional: without it /attendance is not served
  salaryRateUseCases, // optional, with authorizationUseCases: without both /salary-rates is not served
  authorizationUseCases,
  workShiftUseCases, // optional: without it /work-shifts is not served
  shiftAssignmentUseCases, // optional: without it /shift-assignments is not served
  documentRequirementUseCases, // optional: without it /document-requirements is not served
  employeeDocumentUseCases, // optional: without it /employee-documents is not served
  jobUseCases, // optional: without it /jobs is not served
  jobApplicationUseCases, // optional, with jobUseCases: without both /job-applications and the portal job routes are not served
  getHealth = () => ({}), // optional: extra fields for GET /health, e.g. the database state
  corsOrigins = [], // origins browsers may call from; empty allows any (see middleware/corsMiddleware.js)
  rateLimits, // optional: { api, auth, trustProxy }; without it nothing is limited (see middleware/rateLimitMiddleware.js)
}) => {
  const app = express();
  const requireAuth = createAuthMiddleware(authUseCases);
  // Behind a reverse proxy (Render) the client's address is in X-Forwarded-For; the limiters need it.
  if (rateLimits?.trustProxy) app.set("trust proxy", rateLimits.trustProxy);

  // Liveness ping for Render and uptime monitors. Always 200 while the process is up: it must not depend
  // on MongoDB, or a slow database would make the platform restart a healthy server.
  app.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()), ...getHealth() });
  });

  // After CORS so a 429 still carries the CORS headers and the browser can show its message; before the body
  // parser so a flood is turned away without parsing anything.
  app.use(createCorsMiddleware(corsOrigins));
  if (rateLimits?.api) app.use(createApiRateLimiter(rateLimits.api));
  if (rateLimits?.auth) {
    const authLimiter = createAuthRateLimiter(rateLimits.auth);
    for (const path of AUTH_ATTEMPT_PATHS) app.post(path, authLimiter);
  }
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
  if (employmentTypeUseCases) {
    app.use("/employment-types", createEmploymentTypeRouter({ employmentTypeUseCases, requireAuth }));
  }
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
        jobUseCases,
        jobApplicationUseCases,
        leaveTypeUseCases,
        leaveBalanceUseCases,
        leaveRequestUseCases,
        borrowingUseCases,
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
  if (notificationUseCases) app.use("/notifications", createNotificationRouter({ notificationUseCases, requireAuth }));

  app.use(errorHandler);

  return app;
};
