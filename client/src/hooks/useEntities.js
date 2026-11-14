import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "./createCrudHooks";
import {
  employeeUseCases,
  departmentUseCases,
  roleUseCases,
  roleAssignmentUseCases,
  leaveTypeUseCases,
  leaveBalanceUseCases,
  leaveRequestUseCases,
  administratorUseCases,
  inventoryUseCases,
  auditLogUseCases,
  dashboardUseCases,
  permissionUseCases,
} from "../container";

export const {
  useList: useEmployees,
  usePage: useEmployeesPage,
  useOne: useEmployee,
  useCreate: useCreateEmployee,
  useUpdate: useUpdateEmployee,
  useRemove: useRemoveEmployee,
} = createCrudHooks("employees", employeeUseCases);

export const {
  useList: useDepartments,
  usePage: useDepartmentsPage,
  useOne: useDepartment,
  useCreate: useCreateDepartment,
  useUpdate: useUpdateDepartment,
  useRemove: useRemoveDepartment,
} = createCrudHooks("departments", departmentUseCases);

export const {
  useList: useRoles,
  usePage: useRolesPage,
  useOne: useRole,
  useCreate: useCreateRole,
  useUpdate: useUpdateRole,
  useRemove: useRemoveRole,
} = createCrudHooks("roles", roleUseCases);

/** The modules and actions a role can be granted. Fixed by the server, so it never goes stale. */
export const usePermissionCatalog = () =>
  useQuery({ queryKey: ["permission-catalog"], queryFn: permissionUseCases.catalog, staleTime: Infinity });

export const {
  useList: useRoleAssignments,
  usePage: useRoleAssignmentsPage,
  useOne: useRoleAssignment,
  useCreate: useCreateRoleAssignment,
  useRemove: useRemoveRoleAssignment,
} = createCrudHooks("role-assignments", roleAssignmentUseCases);

export const {
  useList: useLeaveTypes,
  usePage: useLeaveTypesPage,
  useOne: useLeaveType,
  useCreate: useCreateLeaveType,
  useUpdate: useUpdateLeaveType,
  useRemove: useRemoveLeaveType,
} = createCrudHooks("leave-types", leaveTypeUseCases);

export const {
  useList: useLeaveBalances,
  usePage: useLeaveBalancesPage,
  useOne: useLeaveBalance,
  useCreate: useCreateLeaveBalance,
  useUpdate: useUpdateLeaveBalance,
  useRemove: useRemoveLeaveBalance,
} = createCrudHooks("leave-balances", leaveBalanceUseCases);

// Leave requests are filed and decided; they have no update or remove.
export const {
  useList: useLeaveRequests,
  usePage: useLeaveRequestsPage,
  useOne: useLeaveRequest,
  useCreate: useCreateLeaveRequest,
} = createCrudHooks("leave-requests", leaveRequestUseCases);

export const {
  useList: useInventory,
  usePage: useInventoryPage,
  useOne: useInventoryItem,
  useCreate: useCreateInventoryItem,
  useUpdate: useUpdateInventoryItem,
  useRemove: useRemoveInventoryItem,
} = createCrudHooks("inventory", inventoryUseCases);

// The audit trail is read-only: pages and single entries only.
export const { usePage: useAuditLogsPage, useOne: useAuditLog } = createCrudHooks("audit-logs", auditLogUseCases);

/** Today's headcount for the dashboard: total, present and absent (on approved leave). */
export const useDashboardSummary = () =>
  useQuery({ queryKey: ["dashboard", "summary"], queryFn: dashboardUseCases.summary });

/** Present versus absent per working day over the last `days` days. */
export const useDashboardAttendance = (days) =>
  useQuery({
    queryKey: ["dashboard", "attendance", days],
    queryFn: () => dashboardUseCases.attendance(days),
    placeholderData: keepPreviousData,
  });

/** Headcount for the employee cards: { total, active, inactive }. */
export const useEmployeeSummary = () =>
  useQuery({ queryKey: ["employees", "summary"], queryFn: employeeUseCases.summary });

// Administrators are only listed (to pick one).
export const { useList: useAdministrators } = createCrudHooks("administrators", administratorUseCases);

/** Approve, reject or cancel a request. Approving also changes a balance, so both lists refresh. */
export const useDecideLeaveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, action, remarks }) =>
      action === "cancel" ? leaveRequestUseCases.cancel(id) : leaveRequestUseCases[action](id, remarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-balances"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }); // approved leave changes who is absent
    },
  });
};

export const useLeaveApprovals = (leaveRequestId) =>
  useQuery({
    queryKey: ["leave-requests", leaveRequestId, "approvals"],
    queryFn: () => leaveRequestUseCases.approvals(leaveRequestId),
    enabled: Boolean(leaveRequestId),
  });
