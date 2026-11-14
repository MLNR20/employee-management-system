// The catalog of things a role can be allowed to do. A permission is "<module>:<action>".
// The catalog lives here (not in the database) so the server and the roles view agree on it.

const CRUD = ["view", "create", "edit", "delete"];

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "employees", label: "Employees", actions: CRUD },
  { key: "departments", label: "Departments", actions: CRUD },
  { key: "roles", label: "Roles & Permissions", actions: CRUD },
  { key: "role-assignments", label: "Role Assignments", actions: ["view", "create", "delete"] },
  { key: "leave-requests", label: "Leave Requests", actions: ["view", "create", "approve", "reject", "cancel"] },
  { key: "leave-balances", label: "Leave Balances", actions: CRUD },
  { key: "leave-types", label: "Leave Types", actions: CRUD },
  { key: "inventory", label: "Inventory", actions: CRUD },
  { key: "attendance", label: "Attendance", actions: ["view", "create", "edit", "delete"] },
  { key: "work-shifts", label: "Work Shifts", actions: ["view", "create", "edit", "delete"] },
  { key: "shift-assignments", label: "Shift Schedules", actions: ["view", "create", "delete"] },
  { key: "documents", label: "Employee Documents", actions: ["view", "create", "edit", "verify", "delete"] },
  { key: "document-requirements", label: "Document Requirements", actions: ["view", "create", "edit", "delete"] },
  // HR only: who may see and set what employees are paid per hour. Enforced by the server.
  { key: "salary-rates", label: "Salary Rates", actions: ["view", "assign"] },
  { key: "audit-logs", label: "Audit Logs", actions: ["view"] },
];

export const permissionKey = (module, action) => `${module}:${action}`;

const VALID_PERMISSIONS = new Set(
  PERMISSION_MODULES.flatMap(({ key, actions }) => actions.map((action) => permissionKey(key, action)))
);

export const isValidPermission = (permission) => VALID_PERMISSIONS.has(permission);

/** Every permission in the catalog, for a role that can do everything. */
export const ALL_PERMISSIONS = [...VALID_PERMISSIONS];
