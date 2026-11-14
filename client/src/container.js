// Composition root: the only place that picks concrete implementations.
// Presentation imports use cases from here and never touches axios or storage.
import { HttpRepository } from "./infrastructure/http/HttpRepository";
import { HttpAuthRepository } from "./infrastructure/repositories/HttpAuthRepository";
import { HttpEmployeeRepository } from "./infrastructure/repositories/HttpEmployeeRepository";
import { HttpDepartmentRepository } from "./infrastructure/repositories/HttpDepartmentRepository";
import { HttpLeaveRequestRepository } from "./infrastructure/repositories/HttpLeaveRequestRepository";
import { HttpPermissionRepository } from "./infrastructure/repositories/HttpPermissionRepository";
import { createAuthUseCases } from "./application/auth/authUseCases";
import { createEmployeeUseCases } from "./application/employee/employeeUseCases";
import { createDepartmentUseCases } from "./application/department/departmentUseCases";
import { createCrudUseCases } from "./application/shared/crudUseCases";
import { createLeaveRequestUseCases } from "./application/leave/leaveRequestUseCases";
import { Role, RoleAssignment } from "./domain/role/Role";
import { LeaveType, LeaveBalance } from "./domain/leave/Leave";
import { AdministratorAccount } from "./domain/auth/AdministratorAccount";
import { Item } from "./domain/inventory/Item";
import { HttpDashboardRepository } from "./infrastructure/repositories/HttpDashboardRepository";
import { HttpEmployeePortalRepository } from "./infrastructure/repositories/HttpEmployeePortalRepository";
import { AuditLog } from "./domain/audit/AuditLog";

export { setSessionExpiredHandler } from "./infrastructure/http/apiClient";

// A plain REST resource needs no subclass: name the path and how a payload becomes an entity.
const restCrud = (resource, fromApi) => createCrudUseCases(new HttpRepository({ resource, fromApi }));

export const authUseCases = createAuthUseCases(new HttpAuthRepository());
export const employeeUseCases = createEmployeeUseCases(new HttpEmployeeRepository());
export const departmentUseCases = createDepartmentUseCases(new HttpDepartmentRepository());

export const roleUseCases = restCrud("roles", Role.fromApi);
const permissionRepository = new HttpPermissionRepository();
export const permissionUseCases = { catalog: () => permissionRepository.getCatalog() };
export const roleAssignmentUseCases = restCrud("role-assignments", RoleAssignment.fromApi);
export const leaveTypeUseCases = restCrud("leave-types", LeaveType.fromApi);
export const leaveBalanceUseCases = restCrud("leave-balances", LeaveBalance.fromApi);
export const administratorUseCases = restCrud("administrators", AdministratorAccount.fromApi);
export const inventoryUseCases = restCrud("inventory", Item.fromApi);

// The employee portal has its own sign-in and token, separate from the administrators'.
export const employeePortal = new HttpEmployeePortalRepository();

const dashboardRepository = new HttpDashboardRepository();
export const dashboardUseCases = {
  summary: () => dashboardRepository.getSummary(),
  attendance: (days) => dashboardRepository.getAttendance(days),
};
export const auditLogUseCases = restCrud("audit-logs", AuditLog.fromApi);

export const leaveRequestUseCases = createLeaveRequestUseCases(new HttpLeaveRequestRepository());
