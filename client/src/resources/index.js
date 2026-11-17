import { departmentResource } from "./departments";
import { employmentTypeResource } from "./employmentTypes";
import { roleResource, roleAssignmentResource } from "./roles";
import { inventoryResource } from "./inventory";
import { auditLogResource } from "./audit";
import { attendanceResource } from "./attendance";
import { salaryRateResource } from "./salaryRates";
import { leaveTypeResource, leaveBalanceResource, leaveRequestResource } from "./leave";
import { workShiftResource, shiftAssignmentResource, documentRequirementResource } from "./onboarding";

/**
 * Every resource that gets a list page, an add page and (when it has an update
 * hook) an edit page. App.js builds the routes and the sidebar builds its links from this list.
 */
export const resources = [
  departmentResource,
  employmentTypeResource,
  roleResource,
  roleAssignmentResource,
  leaveRequestResource,
  leaveBalanceResource,
  leaveTypeResource,
  inventoryResource,
  attendanceResource,
  salaryRateResource,
  auditLogResource,
  documentRequirementResource,
  workShiftResource,
  shiftAssignmentResource,
];
