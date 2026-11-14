import { ALL_PERMISSIONS, permissionKey } from "./permissions.js";

// Development accounts created by `node scripts/seed.js`. Sign in with the email as the username.
// These are well-known passwords: change them (or do not seed) anywhere real people can reach.

const MODULES_A_USER_CAN_SEE = [
  "dashboard",
  "employees",
  "departments",
  "leave-requests",
  "leave-balances",
  "leave-types",
  "inventory",
  "attendance",
];

export const DEFAULT_ACCOUNTS = [
  {
    username: "admin@ga31.com",
    email: "admin@ga31.com",
    password: "admin123",
    first_name: "Admin",
    last_name: "GA31",
    // Everything, including assigning salary rates (HR).
    role: { name: "Administrator", description: "Full access, including HR salary rates", permissions: ALL_PERMISSIONS },
  },
  {
    username: "user@ga31.com",
    email: "user@ga31.com",
    password: "user123",
    first_name: "User",
    last_name: "GA31",
    // Can look around and file leave or time records; no roles, audit logs or salary rates.
    role: {
      name: "User",
      description: "Read access plus filing leave and attendance. No HR, roles or salary access.",
      permissions: [
        ...MODULES_A_USER_CAN_SEE.map((module) => permissionKey(module, "view")),
        permissionKey("leave-requests", "create"),
        permissionKey("attendance", "create"),
      ],
    },
  },
];
