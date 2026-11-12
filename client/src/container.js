// Composition root: the only place that picks concrete implementations.
// Presentation imports use cases from here and never touches axios or storage.
import { HttpRepository } from "./infrastructure/http/HttpRepository";
import { HttpAuthRepository } from "./infrastructure/repositories/HttpAuthRepository";
import { HttpEmployeeRepository } from "./infrastructure/repositories/HttpEmployeeRepository";
import { HttpDepartmentRepository } from "./infrastructure/repositories/HttpDepartmentRepository";
import { HttpLeaveRequestRepository } from "./infrastructure/repositories/HttpLeaveRequestRepository";
import { createAuthUseCases } from "./application/auth/authUseCases";
import { createEmployeeUseCases } from "./application/employee/employeeUseCases";
import { createDepartmentUseCases } from "./application/department/departmentUseCases";
import { createCrudUseCases } from "./application/shared/crudUseCases";
import { createLeaveRequestUseCases } from "./application/leave/leaveRequestUseCases";
import { Role, RoleAssignment } from "./domain/role/Role";
import { LeaveType, LeaveBalance } from "./domain/leave/Leave";
import { AdministratorAccount } from "./domain/auth/AdministratorAccount";

export { setSessionExpiredHandler } from "./infrastructure/http/apiClient";

// A plain REST resource needs no subclass: name the path and how a payload becomes an entity.
const restCrud = (resource, fromApi) => createCrudUseCases(new HttpRepository({ resource, fromApi }));

export const authUseCases = createAuthUseCases(new HttpAuthRepository());
export const employeeUseCases = createEmployeeUseCases(new HttpEmployeeRepository());
export const departmentUseCases = createDepartmentUseCases(new HttpDepartmentRepository());

export const roleUseCases = restCrud("roles", Role.fromApi);
export const roleAssignmentUseCases = restCrud("role-assignments", RoleAssignment.fromApi);
export const leaveTypeUseCases = restCrud("leave-types", LeaveType.fromApi);
export const leaveBalanceUseCases = restCrud("leave-balances", LeaveBalance.fromApi);
export const administratorUseCases = restCrud("administrators", AdministratorAccount.fromApi);

export const leaveRequestUseCases = createLeaveRequestUseCases(new HttpLeaveRequestRepository());
