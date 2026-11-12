import { departmentResource } from "./departments";
import { roleResource, roleAssignmentResource } from "./roles";
import { inventoryResource } from "./inventory";
import { auditLogResource } from "./audit";
import { leaveTypeResource, leaveBalanceResource, leaveRequestResource } from "./leave";

/**
 * Every resource that gets a list page, an add page and (when it has an update
 * hook) an edit page. App.js builds the routes and the sidebar builds its links from this list.
 */
export const resources = [
  departmentResource,
  roleResource,
  roleAssignmentResource,
  leaveRequestResource,
  leaveBalanceResource,
  leaveTypeResource,
  inventoryResource,
  auditLogResource,
];
