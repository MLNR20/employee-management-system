import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
} from "../container";

export const {
  useList: useEmployees,
  useOne: useEmployee,
  useCreate: useCreateEmployee,
  useUpdate: useUpdateEmployee,
  useRemove: useRemoveEmployee,
} = createCrudHooks("employees", employeeUseCases);

export const {
  useList: useDepartments,
  useOne: useDepartment,
  useCreate: useCreateDepartment,
  useUpdate: useUpdateDepartment,
  useRemove: useRemoveDepartment,
} = createCrudHooks("departments", departmentUseCases);

export const {
  useList: useRoles,
  useOne: useRole,
  useCreate: useCreateRole,
  useUpdate: useUpdateRole,
  useRemove: useRemoveRole,
} = createCrudHooks("roles", roleUseCases);

export const {
  useList: useRoleAssignments,
  useOne: useRoleAssignment,
  useCreate: useCreateRoleAssignment,
  useRemove: useRemoveRoleAssignment,
} = createCrudHooks("role-assignments", roleAssignmentUseCases);

export const {
  useList: useLeaveTypes,
  useOne: useLeaveType,
  useCreate: useCreateLeaveType,
  useUpdate: useUpdateLeaveType,
  useRemove: useRemoveLeaveType,
} = createCrudHooks("leave-types", leaveTypeUseCases);

export const {
  useList: useLeaveBalances,
  useOne: useLeaveBalance,
  useCreate: useCreateLeaveBalance,
  useUpdate: useUpdateLeaveBalance,
  useRemove: useRemoveLeaveBalance,
} = createCrudHooks("leave-balances", leaveBalanceUseCases);

// Leave requests are filed and decided; they have no update or remove.
export const {
  useList: useLeaveRequests,
  useOne: useLeaveRequest,
  useCreate: useCreateLeaveRequest,
} = createCrudHooks("leave-requests", leaveRequestUseCases);

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
    },
  });
};

export const useLeaveApprovals = (leaveRequestId) =>
  useQuery({
    queryKey: ["leave-requests", leaveRequestId, "approvals"],
    queryFn: () => leaveRequestUseCases.approvals(leaveRequestId),
    enabled: Boolean(leaveRequestId),
  });
