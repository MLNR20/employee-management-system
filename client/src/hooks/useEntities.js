import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCrudHooks } from "./createCrudHooks";
import { hasContactInput, toContactPayload } from "../domain/employee/emergencyContactRules";
import {
  employeeUseCases,
  emergencyContactUseCases,
  employmentTypeUseCases,
  positionUseCases,
  payrollDeductionUseCases,
  attendanceUseCases,
  salaryRateUseCases,
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
  payrollUseCases,
  permissionUseCases,
  workShiftUseCases,
  shiftAssignmentUseCases,
  documentRequirementUseCases,
  employeeDocumentUseCases,
  documentChecklistUseCases,
  offboardingUseCases,
} from "../container";
import { allows } from "../domain/role/access";

export const {
  useList: useEmployees,
  usePage: useEmployeesPage,
  useOne: useEmployee,
  useCreate: useCreateEmployee,
  useUpdate: useUpdateEmployee,
  useRemove: useRemoveEmployee,
} = createCrudHooks("employees", employeeUseCases);

export const {
  useList: useEmergencyContacts,
  usePage: useEmergencyContactsPage,
  useOne: useEmergencyContact,
  useCreate: useCreateEmergencyContact,
  useUpdate: useUpdateEmergencyContact,
  useRemove: useRemoveEmergencyContact,
} = createCrudHooks("emergency-contacts", emergencyContactUseCases);

/** The emergency contacts of one employee. Under the "emergency-contacts" key, so any contact change refreshes it. */
export const useEmployeeEmergencyContacts = (employeeId) =>
  useQuery({
    queryKey: ["emergency-contacts", "employee", employeeId],
    queryFn: () => emergencyContactUseCases.listForEmployee(employeeId),
    enabled: Boolean(employeeId),
  });

/**
 * Saves the emergency contacts typed into the employee form: new ones are added, changed ones updated
 * and ones taken off the form deleted. `contacts` are the rows on the form (see emergencyContactRules),
 * `existing` the contacts the employee had when the form opened. Resolves to the number that failed.
 */
export const useSaveEmergencyContacts = () => {
  const create = useCreateEmergencyContact();
  const update = useUpdateEmergencyContact();
  const remove = useRemoveEmergencyContact();

  return async ({ employeeId, contacts, existing = [] }) => {
    const kept = new Set(contacts.map((contact) => contact.id).filter(Boolean));
    const requests = [
      ...existing.filter((contact) => !kept.has(contact.id)).map((contact) => remove.mutateAsync(contact.id)),
      ...contacts
        .filter((contact) => hasContactInput(contact))
        .map((contact) =>
          contact.id
            ? update.mutateAsync({ id: contact.id, data: toContactPayload(employeeId, contact) })
            : create.mutateAsync(toContactPayload(employeeId, contact))
        ),
    ];
    const results = await Promise.allSettled(requests);
    return results.filter((result) => result.status === "rejected").length;
  };
};

export const {
  useList: useEmploymentTypes,
  usePage: useEmploymentTypesPage,
  useOne: useEmploymentType,
  useCreate: useCreateEmploymentType,
  useUpdate: useUpdateEmploymentType,
  useRemove: useRemoveEmploymentType,
} = createCrudHooks("employment-types", employmentTypeUseCases);

export const {
  useList: useAttendance,
  usePage: useAttendancePage,
  useOne: useAttendanceRecord,
  useCreate: useCreateAttendance,
  useUpdate: useUpdateAttendance,
  useRemove: useRemoveAttendance,
} = createCrudHooks("attendance", attendanceUseCases);

export const {
  useList: useSalaryRates,
  usePage: useSalaryRatesPage,
  useOne: useSalaryRate,
  useCreate: useAssignSalaryRate,
} = createCrudHooks("salary-rates", salaryRateUseCases);

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

/**
 * What the signed-in administrator may do. It only decides what the screens show: the server
 * checks every permission itself, so hiding something here never replaces that check.
 */
export const useMyPermissions = () =>
  useQuery({
    queryKey: ["my-permissions"],
    queryFn: permissionUseCases.mine,
    staleTime: 60 * 1000,
    retry: false,
  });

/** { can(permission or list), isLoading, isError }: for screens that check several permissions. */
export const useAccess = () => {
  const { data, isLoading, isError } = useMyPermissions();
  return { can: (required) => allows(data, required), isLoading, isError };
};

/** { allowed, isLoading } for one permission such as "salary-rates:view". Not allowed until it is known. */
export const useCan = (permission) => {
  const { data, isLoading } = useMyPermissions();
  return { allowed: Boolean(data?.includes(permission)), isLoading };
};

/** The modules and actions a role can be granted. Fixed by the server, so it never goes stale. */
export const usePermissionCatalog = () =>
  useQuery({ queryKey: ["permission-catalog"], queryFn: permissionUseCases.catalog, staleTime: Infinity });

export const {
  useList: useWorkShifts,
  usePage: useWorkShiftsPage,
  useOne: useWorkShift,
  useCreate: useCreateWorkShift,
  useUpdate: useUpdateWorkShift,
  useRemove: useRemoveWorkShift,
} = createCrudHooks("work-shifts", workShiftUseCases);

// Assignments are added and removed, never edited.
export const {
  useList: useShiftAssignments,
  usePage: useShiftAssignmentsPage,
  useOne: useShiftAssignment,
  useCreate: useCreateShiftAssignment,
  useRemove: useRemoveShiftAssignment,
} = createCrudHooks("shift-assignments", shiftAssignmentUseCases);

export const {
  useList: useDocumentRequirements,
  usePage: useDocumentRequirementsPage,
  useOne: useDocumentRequirement,
  useCreate: useCreateDocumentRequirement,
  useUpdate: useUpdateDocumentRequirement,
  useRemove: useRemoveDocumentRequirement,
} = createCrudHooks("document-requirements", documentRequirementUseCases);

export const {
  useCreate: useCreateEmployeeDocument,
  useUpdate: useUpdateEmployeeDocument,
} = createCrudHooks("employee-documents", employeeDocumentUseCases);

/**
 * One employee's onboarding or offboarding checklist. It sits under the "employee-documents" key, so any
 * change to their documents refreshes it.
 */
export const useDocumentChecklist = (employeeId, stage = "onboarding") =>
  useQuery({
    queryKey: ["employee-documents", "checklist", employeeId, stage],
    queryFn: () => documentChecklistUseCases.checklist(employeeId, stage),
    enabled: Boolean(employeeId),
  });

/**
 * One employee's offboarding, with what is still outstanding. Always fetched afresh when opened, since
 * documents, equipment, leave and reporting lines all change it from other screens.
 */
export const useOffboarding = (employeeId) =>
  useQuery({
    queryKey: ["offboarding", employeeId],
    queryFn: () => offboardingUseCases.get(employeeId),
    enabled: Boolean(employeeId),
    staleTime: 0,
  });

/** Runs one offboarding step: "start", "update", "complete", "cancel" or "rehire". */
export const useOffboardingAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, name, details }) => offboardingUseCases[name](employeeId, details),
    onSuccess: () => {
      // The step changes the employee, may clear documents and changes today's headcount.
      for (const key of ["offboarding", "employees", "employee-documents", "dashboard"]) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
    },
  });
};

/**
 * Uploads or removes a document's file: mutate({ id, file }) uploads, mutate({ id }) removes. A record
 * that does not exist yet is created first from `record`.
 */
export const useDocumentFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file, record }) => {
      const documentId = id ?? (await employeeDocumentUseCases.add(record)).id;
      if (!file) return documentChecklistUseCases.removeFile(documentId);
      if (id && record) await employeeDocumentUseCases.update(id, record); // e.g. the new copy's expiry date
      return documentChecklistUseCases.upload(documentId, file);
    },
    // Even after a failure: the record may have been created before the upload was refused.
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
      queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
  });
};

/** HR verifies or rejects a received document (rejecting needs the reason). */
export const useReviewDocument = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, remarks }) =>
      action === "reject" ? documentChecklistUseCases.reject(id, remarks) : documentChecklistUseCases.verify(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-documents"] });
      queryClient.invalidateQueries({ queryKey: ["offboarding"] });
    },
  });
};

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

/** Works out a leaving employee's final pay: mutate({ employeeId, input }); the result is `data`. */
export const useFinalPay = () =>
  useMutation({ mutationFn: ({ employeeId, input }) => payrollUseCases.finalPay(employeeId, input) });

export const {
  useList: usePositions,
  usePage: usePositionsPage,
  useOne: usePosition,
  useCreate: useCreatePosition,
  useUpdate: useUpdatePosition,
  useRemove: useRemovePosition,
} = createCrudHooks("positions", positionUseCases);

export const {
  useList: usePayrollDeductions,
  usePage: usePayrollDeductionsPage,
  useOne: usePayrollDeduction,
  useCreate: useCreatePayrollDeduction,
  useUpdate: useUpdatePayrollDeduction,
  useRemove: useRemovePayrollDeduction,
} = createCrudHooks("payroll-deductions", payrollDeductionUseCases);

/** HR's payroll report for the days from `from` to `to` ("YYYY-MM-DD"). Waits until both are set. */
export const usePayroll = ({ from, to }) =>
  useQuery({
    queryKey: ["payroll", from, to],
    queryFn: () => payrollUseCases.report({ from, to }),
    enabled: Boolean(from && to && from <= to),
    placeholderData: keepPreviousData,
  });

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
