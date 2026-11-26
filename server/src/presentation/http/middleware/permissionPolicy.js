import express from "express";
import { ForbiddenError } from "../../../domain/errors.js";

// Who may call what on the administrator API: this file is the whole answer.
//
// Every route group listed in GUARDED is closed unless a rule below opens it, so a new route added to
// one of them is refused until it is given a rule here. A new route group must be added to GUARDED.
// Sign-in (/admin/login...), the employee portal and /health are not administrator routes and are not
// listed; registration and password changes also require a signed-in administrator in adminRoutes.js.
//
// The rules are matched by an Express router, so they read paths exactly as the real routers do
// (ignoring case and a trailing slash).

export const GUARDED = [
  "/administrators",
  "/attendance",
  "/audit-logs",
  "/dashboard",
  "/departments",
  "/document-requirements",
  "/emergency-contacts",
  "/employee-documents",
  "/employees",
  "/employment-types",
  "/inventory",
  "/job-applications",
  "/jobs",
  "/leave-balances",
  "/leave-requests",
  "/leave-types",
  "/notifications",
  "/offboarding",
  "/payroll",
  "/role-assignments",
  "/roles",
  "/salary-rates",
  "/shift-assignments",
  "/work-shifts",
];

/** Creating administrator accounts and resetting their passwords is part of managing who has access. */
const MANAGE_ADMINISTRATORS = "role-assignments:create";

/**
 * @param {Object} deps
 * @param {Function} deps.requireAuth the administrator sign-in middleware
 * @param {(...permissions: string[]) => Function} deps.requirePermission passes a holder of any one of them
 */
export const createPermissionPolicy = ({ requireAuth, requirePermission }) => {
  const policy = express.Router();

  // Leaving the router as soon as one rule passes means only the first matching rule applies.
  const pass = (req, res, next) => next("router");
  /** Opens a route to administrators holding any of `permissions`. */
  const allow = (method, path, ...permissions) =>
    policy[method](path, requireAuth, requirePermission(...permissions), pass);
  /** Opens a route to every signed-in administrator. */
  const allowSignedIn = (method, path) => policy[method](path, requireAuth, pass);

  /**
   * The standard routes of one resource. `view`, `create`, `edit` and `remove` are the permissions
   * accepted for each (any one is enough); leave one out when the resource has no such route.
   */
  const resource = (base, { view, create, edit, remove }) => {
    if (view) allow("get", [base, `${base}/:id`], ...view);
    if (create) allow("post", base, ...create);
    if (edit) allow("put", `${base}/:id`, ...edit);
    if (remove) allow("delete", `${base}/:id`, ...remove);
  };
  /** A resource whose permissions are the module's own four. */
  const crud = (base, module, view = []) =>
    resource(base, {
      view: [`${module}:view`, ...view],
      create: [`${module}:create`],
      edit: [`${module}:edit`],
      remove: [`${module}:delete`],
    });

  // --- Open to every signed-in administrator: what the app itself needs to draw any screen ---
  allowSignedIn("get", ["/roles/mine", "/roles/permissions"]);
  allowSignedIn("get", "/employees/protected"); // "who am I?"
  allowSignedIn("get", "/administrators"); // names, to show who approved or assigned something
  allowSignedIn("get", ["/notifications", "/notifications/unread-count"]);
  allowSignedIn("post", "/notifications/read-all");
  allowSignedIn("patch", "/notifications/:id/read");

  // --- Access management ---
  allow("post", "/admin/register", MANAGE_ADMINISTRATORS);
  allow("post", "/administrators/:id/password", MANAGE_ADMINISTRATORS);
  allow("post", "/notifications", MANAGE_ADMINISTRATORS); // a message to every administrator
  resource("/roles", {
    view: ["roles:view", "role-assignments:view"],
    create: ["roles:create"],
    edit: ["roles:edit"],
    remove: ["roles:delete"],
  });
  resource("/role-assignments", {
    view: ["role-assignments:view"],
    create: ["role-assignments:create"],
    remove: ["role-assignments:delete"],
  });
  resource("/audit-logs", { view: ["audit-logs:view"] });

  // --- Employees. The fixed paths come before "/employees/:id" so they are not read as an id ---
  allow("get", "/employees/summary", "employees:view", "dashboard:view");
  allow("get", "/employees/:id/leave-balances", "leave-balances:view");
  allow("get", "/employees/:id/leave-requests", "leave-requests:view");
  allow("get", ["/employees/:id/direct-reports", "/employees/:id/emergency-contacts"], "employees:view");
  crud("/employees", "employees");
  resource("/emergency-contacts", {
    view: ["employees:view"],
    create: ["employees:create", "employees:edit"], // also saved right after a new employee
    edit: ["employees:edit"],
    remove: ["employees:edit"],
  });
  allow("get", "/offboarding/:employeeId", "employees:view");
  allow("post", ["/offboarding/:employeeId", "/offboarding/:employeeId/complete", "/offboarding/:employeeId/rehire"], "employees:edit");
  allow("put", "/offboarding/:employeeId", "employees:edit");
  allow("delete", "/offboarding/:employeeId", "employees:edit");
  // Job openings have no module of their own: they are part of looking after the workforce.
  crud("/jobs", "employees");
  allow("get", ["/job-applications", "/job-applications/:id", "/job-applications/job/:jobId"], "employees:view");
  allow("put", "/job-applications/:id/status", "employees:edit");

  // --- Organization ---
  crud("/departments", "departments");
  resource("/employment-types", {
    view: ["departments:view", "employees:view"],
    create: ["departments:create"],
    edit: ["departments:edit"],
    remove: ["departments:delete"],
  });

  // --- Leave ---
  allow("get", "/leave-requests/:id/approvals", "leave-requests:view");
  for (const action of ["approve", "reject", "cancel"]) {
    allow("post", `/leave-requests/:id/${action}`, `leave-requests:${action}`);
  }
  resource("/leave-requests", { view: ["leave-requests:view"], create: ["leave-requests:create"] });
  crud("/leave-balances", "leave-balances");
  crud("/leave-types", "leave-types", ["leave-requests:view", "leave-balances:view"]); // their names

  // --- Time, pay, assets, documents ---
  allow(
    "post",
    ["/attendance/time-in", "/attendance/lunch-out", "/attendance/lunch-in", "/attendance/time-out"],
    "attendance:create"
  );
  crud("/attendance", "attendance");
  crud("/work-shifts", "work-shifts", ["shift-assignments:view", "attendance:view"]);
  allow("get", "/shift-assignments/employee/:employeeId", "shift-assignments:view");
  resource("/shift-assignments", {
    view: ["shift-assignments:view"],
    create: ["shift-assignments:create"],
    remove: ["shift-assignments:delete"],
  });
  allow("get", "/salary-rates/employee/:employeeId", "salary-rates:view");
  resource("/salary-rates", { view: ["salary-rates:view"], create: ["salary-rates:assign"] });
  allow("get", "/payroll", "salary-rates:view");
  crud("/inventory", "inventory");
  crud("/document-requirements", "document-requirements", ["documents:view"]);
  allow("get", "/employee-documents/checklist/:employeeId", "documents:view");
  allow("post", ["/employee-documents/:id/verify", "/employee-documents/:id/reject"], "documents:verify");
  crud("/employee-documents", "documents");

  // --- The dashboard ---
  allow("get", ["/dashboard/summary", "/dashboard/attendance"], "dashboard:view");

  // Anything else in a guarded group is refused.
  policy.use(GUARDED, requireAuth, (req, res, next) =>
    next(new ForbiddenError("No role allows this request."))
  );

  return policy;
};
