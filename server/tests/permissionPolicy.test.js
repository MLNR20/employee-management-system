// Role permissions on the administrator API: which permission each route takes, that nothing under a
// guarded group is open by accident, and that the real wiring enforces it.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createApp } from "../src/presentation/http/app.js";
import { createPermissionPolicy, GUARDED } from "../src/presentation/http/middleware/permissionPolicy.js";
import { createRequirePermission } from "../src/presentation/http/middleware/permissionMiddleware.js";
import { createAuthMiddleware } from "../src/presentation/http/middleware/authMiddleware.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { ALL_PERMISSIONS, isValidPermission } from "../src/domain/role/permissions.js";
import { DEFAULT_ACCOUNTS } from "../src/domain/role/defaultAccounts.js";
import { InvalidTokenError } from "../src/domain/errors.js";
import { createAdminRouter } from "../src/presentation/http/routes/adminRoutes.js";
import { createEmployeeRouter } from "../src/presentation/http/routes/employeeRoutes.js";
import { createOffboardingRouter } from "../src/presentation/http/routes/offboardingRoutes.js";
import { createEmergencyContactRouter } from "../src/presentation/http/routes/emergencyContactRoutes.js";
import { createDepartmentRouter } from "../src/presentation/http/routes/departmentRoutes.js";
import { createEmploymentTypeRouter } from "../src/presentation/http/routes/employmentTypeRoutes.js";
import { createAttendanceRouter } from "../src/presentation/http/routes/attendanceRoutes.js";
import { createSalaryRateRouter } from "../src/presentation/http/routes/salaryRateRoutes.js";
import { createPayrollDeductionRouter, createPayrollRouter } from "../src/presentation/http/routes/payrollRoutes.js";
import { createPositionRouter } from "../src/presentation/http/routes/positionRoutes.js";
import { createWorkShiftRouter, createShiftAssignmentRouter } from "../src/presentation/http/routes/shiftRoutes.js";
import { createDocumentRequirementRouter, createEmployeeDocumentRouter } from "../src/presentation/http/routes/documentRoutes.js";
import {
  createAdministratorListRouter,
  createLeaveBalanceRouter,
  createLeaveRequestRouter,
  createLeaveTypeRouter,
  createRoleAssignmentRouter,
  createRoleRouter,
} from "../src/presentation/http/routes/hrRoutes.js";
import { createAuditLogRouter } from "../src/presentation/http/routes/auditLogRoutes.js";
import { createNotificationRouter } from "../src/presentation/http/routes/notificationRoutes.js";
import { createInventoryRouter } from "../src/presentation/http/routes/inventoryRoutes.js";
import { createDashboardRouter } from "../src/presentation/http/routes/dashboardRoutes.js";
import { createJobRouter, createJobApplicationRouter } from "../src/presentation/http/routes/jobRoutes.js";

const ID = "000000000000000000000001";

// The token is the comma-separated list of permissions its holder has.
const authUseCases = {
  authenticate: (token) => {
    if (token === "bad") throw new InvalidTokenError();
    return { id: ID, permissions: token === "none" ? [] : token.split(",") };
  },
};
const requireAuth = createAuthMiddleware(authUseCases);
const requirePermission = createRequirePermission({ hasPermission: async () => false });

let server;
let base;

before(async () => {
  // The policy on its own: whatever it lets through is answered "allowed".
  const app = express();
  app.use(createPermissionPolicy({ requireAuth, requirePermission }));
  app.use((req, res) => res.status(200).json({ allowed: true }));
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const status = async (method, path, permissions) => {
  const headers = permissions === undefined ? {} : { Authorization: `Bearer ${permissions || "none"}` };
  return (await fetch(base + path, { method, headers })).status;
};

// [method, path, a permission that is enough]
const RULES = [
  ["GET", "/dashboard/summary", "dashboard:view"],
  ["GET", "/employees", "employees:view"],
  ["GET", `/employees/${ID}`, "employees:view"],
  ["GET", "/employees/summary", "dashboard:view"],
  ["POST", "/employees", "employees:create"],
  ["PUT", `/employees/${ID}`, "employees:edit"],
  ["DELETE", `/employees/${ID}`, "employees:delete"],
  ["GET", `/employees/${ID}/leave-balances`, "leave-balances:view"],
  ["GET", `/employees/${ID}/leave-requests`, "leave-requests:view"],
  ["GET", `/offboarding/${ID}`, "employees:view"],
  ["POST", `/offboarding/${ID}`, "employees:edit"],
  ["POST", `/offboarding/${ID}/complete`, "employees:edit"],
  ["POST", `/offboarding/${ID}/rehire`, "employees:edit"],
  ["PUT", `/offboarding/${ID}`, "employees:edit"],
  ["DELETE", `/offboarding/${ID}`, "employees:edit"],
  ["POST", "/emergency-contacts", "employees:create"],
  ["DELETE", `/departments/${ID}`, "departments:delete"],
  ["GET", "/employment-types", "employees:view"],
  ["POST", "/admin/register", "role-assignments:create"],
  ["POST", `/administrators/${ID}/password`, "role-assignments:create"],
  ["GET", "/roles", "roles:view"],
  ["PUT", `/roles/${ID}`, "roles:edit"],
  ["POST", "/role-assignments", "role-assignments:create"],
  ["POST", "/leave-requests", "leave-requests:create"],
  ["POST", `/leave-requests/${ID}/approve`, "leave-requests:approve"],
  ["POST", `/leave-requests/${ID}/reject`, "leave-requests:reject"],
  ["POST", `/leave-requests/${ID}/cancel`, "leave-requests:cancel"],
  ["PUT", `/leave-balances/${ID}`, "leave-balances:edit"],
  ["POST", "/attendance/time-in", "attendance:create"],
  ["PUT", `/attendance/${ID}`, "attendance:edit"],
  ["POST", "/work-shifts", "work-shifts:create"],
  ["DELETE", `/shift-assignments/${ID}`, "shift-assignments:delete"],
  ["GET", `/employee-documents/checklist/${ID}`, "documents:view"],
  ["POST", `/employee-documents/${ID}/verify`, "documents:verify"],
  ["POST", `/employee-documents/${ID}/reject`, "documents:verify"],
  ["POST", "/document-requirements", "document-requirements:create"],
  ["POST", "/salary-rates", "salary-rates:assign"],
  ["GET", "/payroll", "salary-rates:view"],
  ["POST", `/payroll/final-pay/${ID}`, "salary-rates:view"],
  ["POST", "/payroll-deductions", "salary-rates:assign"],
  ["DELETE", `/payroll-deductions/${ID}`, "salary-rates:assign"],
  ["GET", "/positions", "employees:view"],
  ["POST", "/positions", "departments:create"],
  ["GET", `/employee-documents/files/${ID}`, "documents:view"],
  ["PUT", `/employee-documents/${ID}/file`, "documents:create"],
  ["DELETE", `/employee-documents/${ID}/file`, "documents:edit"],
  ["DELETE", `/inventory/${ID}`, "inventory:delete"],
  ["GET", "/audit-logs", "audit-logs:view"],
  ["POST", "/jobs", "employees:create"],
  ["PUT", `/job-applications/${ID}/status`, "employees:edit"],
  ["POST", "/notifications", "role-assignments:create"],
];

test("each route needs its permission: refused without it, allowed with it", async () => {
  for (const [method, path, permission] of RULES) {
    const name = `${method} ${path}`;
    assert.ok(isValidPermission(permission), `${permission} is in the catalog`);
    assert.equal(await status(method, path), 401, `${name} without signing in`);
    assert.equal(await status(method, path, ""), 403, `${name} with no permissions`);
    const everythingElse = ALL_PERMISSIONS.filter((p) => p.split(":")[1] === "view" && p !== permission);
    if (!permission.endsWith(":view")) {
      assert.equal(await status(method, path, everythingElse.join(",")), 403, `${name} with only view permissions`);
    }
    assert.equal(await status(method, path, permission), 200, `${name} with ${permission}`);
  }
});

test("another spelling of a path is guarded the same way", async () => {
  for (const path of ["/EMPLOYEES", "/Employees/", `/employees/${ID}/`, "/ROLES"]) {
    assert.equal(await status("GET", path, ""), 403, path);
  }
  assert.equal(await status("POST", "/Admin/Register/", ""), 403);
  assert.equal(await status("HEAD", "/employees", ""), 403);
});

test("an unlisted route in a guarded group is refused even with every permission", async () => {
  const all = ALL_PERMISSIONS.join(",");
  assert.equal(await status("PATCH", `/employees/${ID}`, all), 403);
  assert.equal(await status("POST", "/payroll", all), 403);
  assert.equal(await status("DELETE", "/audit-logs/1", all), 403);
  for (const prefix of GUARDED) assert.equal(await status("GET", `${prefix}/x/y/z`, all), 403, prefix);
});

test("what every administrator needs is open to any signed-in one, and sign-in routes are left alone", async () => {
  for (const [method, path] of [
    ["GET", "/roles/mine"],
    ["GET", "/roles/permissions"],
    ["GET", "/employees/protected"],
    ["GET", "/administrators"],
    ["GET", "/notifications/unread-count"],
    ["POST", "/notifications/read-all"],
  ]) {
    assert.equal(await status(method, path, ""), 200, path);
    assert.equal(await status(method, path), 401, `${path} anonymously`);
  }
  for (const path of ["/admin/login", "/admin/refresh", "/employee-auth/login", "/employee-portal/password"]) {
    assert.equal(await status("POST", path), 200, `${path} is not the policy's business`);
  }
});

// A route added to a router without a rule would be refused to everyone: catch that here.
test("every administrator route the routers serve has a rule", async () => {
  const any = () => new Proxy({}, { get: () => async () => ({}) });
  const deps = new Proxy({ requireAuth, requirePermission }, { get: (known, name) => known[name] ?? any() });
  const routers = [
    ["/employees", createEmployeeRouter],
    ["/offboarding", createOffboardingRouter],
    ["/emergency-contacts", createEmergencyContactRouter],
    ["/departments", createDepartmentRouter],
    ["/employment-types", createEmploymentTypeRouter],
    ["/attendance", createAttendanceRouter],
    ["/salary-rates", createSalaryRateRouter],
    ["/payroll", createPayrollRouter],
    ["/payroll-deductions", createPayrollDeductionRouter],
    ["/positions", createPositionRouter],
    ["/work-shifts", createWorkShiftRouter],
    ["/shift-assignments", createShiftAssignmentRouter],
    ["/document-requirements", createDocumentRequirementRouter],
    ["/employee-documents", createEmployeeDocumentRouter],
    ["/roles", createRoleRouter],
    ["/role-assignments", createRoleAssignmentRouter],
    ["/leave-types", createLeaveTypeRouter],
    ["/leave-balances", createLeaveBalanceRouter],
    ["/leave-requests", createLeaveRequestRouter],
    ["/administrators", createAdministratorListRouter],
    ["/audit-logs", createAuditLogRouter],
    ["/notifications", createNotificationRouter],
    ["/inventory", createInventoryRouter],
    ["/dashboard", createDashboardRouter],
    ["/jobs", createJobRouter],
    ["/job-applications", createJobApplicationRouter],
  ];
  assert.deepEqual(routers.map(([prefix]) => prefix).sort(), [...GUARDED].sort(), "every guarded group is checked");

  const all = ALL_PERMISSIONS.join(",");
  let checked = 0;
  for (const [prefix, create] of routers) {
    for (const { route } of create(deps).stack) {
      if (!route) continue;
      for (const path of [route.path].flat()) {
        for (const method of Object.keys(route.methods)) {
          const url = prefix + path.replace(/:\w+/g, ID).replace(/\/$/, "");
          assert.equal(await status(method.toUpperCase(), url, all), 200, `no rule for ${method.toUpperCase()} ${url}`);
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 80, `only ${checked} routes found`);

  // The two administrator routes that need a signed-in administrator.
  const adminPaths = createAdminRouter(deps).stack.map(({ route }) => route.path);
  assert.ok(adminPaths.includes("/register") && adminPaths.includes("/password"));
});

test("the development Manager account can look and file, but not change access or delete", async () => {
  const manager = DEFAULT_ACCOUNTS.find((account) => account.role.name === "Manager").role.permissions.join(",");
  for (const path of ["/employees", "/departments", "/leave-requests", "/dashboard/summary", "/work-shifts"]) {
    assert.equal(await status("GET", path, manager), 200, path);
  }
  for (const [method, path] of [
    ["DELETE", `/employees/${ID}`],
    ["POST", `/offboarding/${ID}/complete`],
    ["POST", "/role-assignments"],
    ["PUT", `/roles/${ID}`],
    ["POST", "/admin/register"],
    ["POST", `/administrators/${ID}/password`],
    ["GET", "/payroll"],
    ["GET", "/audit-logs"],
  ]) {
    assert.equal(await status(method, path, manager), 403, `${method} ${path}`);
  }
});

// The composition root and the app together: a server built the way index.js builds it refuses.
// The refusal comes before any database call, so no MongoDB is needed.
test("the production wiring enforces permissions", async () => {
  const container = await import("../src/container.js");
  const token = container.authUseCases;
  assert.ok(container.authorizationUseCases && container.accessUseCases && token);

  const jwt = (await import("jsonwebtoken")).default;
  const { default: config } = await import("../src/infrastructure/config/config.js");
  const accessToken = jwt.sign({ id: ID, permissions: [] }, config.JWT_SECRET, { expiresIn: "1m" });

  const live = createApp({ ...container, auditLogUseCases: undefined });
  const listening = await new Promise((resolve) => {
    const s = live.listen(0, () => resolve(s));
  });
  const call = (method, path, auth = true) =>
    fetch(`http://localhost:${listening.address().port}${path}`, {
      method,
      headers: auth ? { Authorization: `Bearer ${accessToken}` } : {},
    }).then((response) => response.status);

  try {
    assert.equal(await call("GET", "/employees"), 403);
    assert.equal(await call("POST", "/role-assignments"), 403);
    assert.equal(await call("POST", "/admin/register"), 403);
    assert.equal(await call("POST", "/admin/register", false), 401);
    assert.equal(await call("GET", "/payroll"), 403);
  } finally {
    listening.close();
  }
});
