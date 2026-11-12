import Swal from "sweetalert2";
import {
  useLeaveTypes,
  useLeaveTypesPage,
  useLeaveType,
  useCreateLeaveType,
  useUpdateLeaveType,
  useRemoveLeaveType,
  useLeaveBalances,
  useLeaveBalancesPage,
  useLeaveBalance,
  useCreateLeaveBalance,
  useUpdateLeaveBalance,
  useRemoveLeaveBalance,
  useLeaveRequests,
  useLeaveRequestsPage,
  useLeaveRequest,
  useCreateLeaveRequest,
  useDecideLeaveRequest,
  useLeaveApprovals,
  useEmployees,
  useAdministrators,
} from "../hooks/useEntities";
import { LeaveStatus, dateOnly } from "../domain/leave/Leave";
import { statusColumn, dateColumn, Badge, nameOf } from "./shared";

const employeeOption = { useList: useEmployees, value: (e) => e.id, label: (e) => e.fullName };
const leaveTypeOption = {
  useList: useLeaveTypes,
  value: (t) => t.id,
  label: (t) => `${t.name}${t.isPaid ? " (paid)" : " (unpaid)"}`,
};

// --- Leave types ---------------------------------------------------------------------------------

export const leaveTypeResource = {
  key: "leave-types",
  title: "Leave Types",
  singular: "Leave Type",
  basePath: "/leave-types",
  hooks: {
    useList: useLeaveTypes,
    usePage: useLeaveTypesPage,
    useOne: useLeaveType,
    useCreate: useCreateLeaveType,
    useUpdate: useUpdateLeaveType,
    useRemove: useRemoveLeaveType,
  },
  columns: () => [
    { key: "name", header: "Leave", sortKey: "name" },
    {
      key: "isPaid",
      header: "Paid",
      sortKey: "isPaid",
      accessor: (t) => (t.isPaid ? "Paid" : "Unpaid"),
      render: (t) => (
        <Badge value={t.isPaid ? "paid" : "unpaid"} tones={{ paid: "bg-blue-100 text-blue-700", unpaid: "bg-gray-100 text-gray-700" }} />
      ),
    },
    statusColumn(),
  ],
  fields: [
    { name: "name", label: "Leave name", type: "text", required: true },
    { name: "isPaid", label: "Paid leave", type: "checkbox", default: false },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};

// --- Leave balances (employee + leave type, max and available) -------------------------------

export const leaveBalanceResource = {
  key: "leave-balances",
  title: "Leave Balances",
  singular: "Leave Balance",
  basePath: "/leave-balances",
  hooks: {
    useList: useLeaveBalances,
    usePage: useLeaveBalancesPage,
    useOne: useLeaveBalance,
    useCreate: useCreateLeaveBalance,
    useUpdate: useUpdateLeaveBalance,
    useRemove: useRemoveLeaveBalance,
  },
  useExtras: () => ({ employees: useEmployees().data, leaveTypes: useLeaveTypes().data }),
  columns: ({ employees, leaveTypes }) => [
    { key: "employee", header: "Employee", accessor: (b) => nameOf(employees, b.employeeId, (e) => e.fullName) },
    { key: "leaveType", header: "Leave type", accessor: (b) => nameOf(leaveTypes, b.leaveTypeId, (t) => t.name) },
    { key: "maxLeaves", header: "Maximum", sortKey: "maxLeaves" },
    { key: "usedLeaves", header: "Used", accessor: (b) => b.usedLeaves },
    { key: "availableLeaves", header: "Available", sortKey: "availableLeaves" },
    statusColumn(),
  ],
  fields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, lockOnEdit: true, optionsFrom: employeeOption },
    { name: "leaveTypeId", label: "Leave type", type: "select", required: true, lockOnEdit: true, optionsFrom: leaveTypeOption },
    { name: "maxLeaves", label: "Maximum leaves", type: "number", required: true, min: 0 },
    {
      name: "availableLeaves",
      label: "Available leaves",
      type: "number",
      min: 0,
      hint: "Leave blank to start with the full maximum. It cannot be more than the maximum.",
      validate: (value, all) =>
        all.maxLeaves !== "" && Number(value) > Number(all.maxLeaves)
          ? "Available leaves cannot be more than the maximum."
          : undefined,
    },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};

// --- Leave requests (filed leave) and who approved them -------------------------------------

const statusTones = {
  [LeaveStatus.PENDING]: "bg-yellow-100 text-yellow-700",
  [LeaveStatus.APPROVED]: "bg-green-100 text-green-700",
  [LeaveStatus.REJECTED]: "bg-red-100 text-red-700",
  [LeaveStatus.CANCELLED]: "bg-gray-100 text-gray-700",
};

const buttonClass = "focus:outline-none text-white font-medium rounded-lg text-sm px-4 py-2";

/** Approve / reject / cancel for a pending request; decided requests show who decided. */
function LeaveRequestActions({ row }) {
  const decide = useDecideLeaveRequest();

  const run = (action, title, withRemarks) =>
    Swal.fire({
      title,
      ...(withRemarks ? { input: "text", inputLabel: "Remarks (optional)" } : { text: "This cannot be undone." }),
      showCancelButton: true,
      confirmButtonText: "Yes",
    }).then((result) => {
      if (!result.isConfirmed) return;
      decide.mutate(
        { id: row.id, action, remarks: result.value },
        {
          onError: (error) =>
            Swal.fire("Could not " + action, error.response?.data?.message ?? "Something went wrong.", "error"),
        }
      );
    });

  if (row.status !== LeaveStatus.PENDING) return <span className="text-gray-400">-</span>;

  return (
    <div className="flex flex-row gap-2">
      <button className={`${buttonClass} bg-green-700 hover:bg-green-800`} onClick={() => run("approve", "Approve this leave?", true)}>
        Approve
      </button>
      <button className={`${buttonClass} bg-red-700 hover:bg-red-800`} onClick={() => run("reject", "Reject this leave?", true)}>
        Reject
      </button>
      <button className={`${buttonClass} bg-gray-600 hover:bg-gray-700`} onClick={() => run("cancel", "Cancel this request?", false)}>
        Cancel
      </button>
    </div>
  );
}

/** "Approved by Jane Doe on 3/4/2025": read from the approval record. */
function DecidedBy({ row }) {
  const decided = row.status === LeaveStatus.APPROVED || row.status === LeaveStatus.REJECTED;
  const { data: approvals = [] } = useLeaveApprovals(decided ? row.id : undefined);
  const { data: administrators = [] } = useAdministrators();

  if (!decided) return <span className="text-gray-400">-</span>;
  const approval = approvals[approvals.length - 1];
  if (!approval) return null;

  return (
    <span>
      {nameOf(administrators, approval.approverId, (a) => a.fullName)}
      {approval.dateCreated && (
        <span className="text-gray-400"> on {approval.dateCreated.toLocaleDateString()}</span>
      )}
      {approval.remarks && <span className="block text-xs text-gray-400">{approval.remarks}</span>}
    </span>
  );
}

// Requests are filed and decided, never edited or deleted: only useCreate, no update or remove.
export const leaveRequestResource = {
  key: "leave-requests",
  title: "Leave Requests",
  singular: "Leave Request",
  basePath: "/leave-requests",
  addLabel: "File Leave",
  hooks: {
    useList: useLeaveRequests,
    usePage: useLeaveRequestsPage,
    useOne: useLeaveRequest,
    useCreate: useCreateLeaveRequest,
  },
  useExtras: () => ({ employees: useEmployees().data, leaveTypes: useLeaveTypes().data }),
  columns: ({ employees, leaveTypes }) => [
    { key: "employee", header: "Employee", accessor: (r) => nameOf(employees, r.employeeId, (e) => e.fullName) },
    { key: "leaveType", header: "Leave type", accessor: (r) => nameOf(leaveTypes, r.leaveTypeId, (t) => t.name) },
    { key: "startDate", header: "From", sortKey: "startDate", accessor: (r) => dateOnly(r.startDate), render: (r) => dateOnly(r.startDate) },
    { key: "endDate", header: "To", sortKey: "endDate", accessor: (r) => dateOnly(r.endDate), render: (r) => dateOnly(r.endDate) },
    { key: "days", header: "Days", sortKey: "days" },
    { key: "status", header: "Status", sortKey: "status", render: (r) => <Badge value={r.status} tones={statusTones} /> },
    { key: "reason", header: "Reason", sortKey: "reason" },
    { key: "decidedBy", header: "Decided by", sortable: false, searchable: false, render: (r) => <DecidedBy row={r} /> },
    dateColumn("dateCreated", "Filed"),
  ],
  rowActions: (row) => <LeaveRequestActions row={row} />,
  fields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, optionsFrom: employeeOption },
    { name: "leaveTypeId", label: "Leave type", type: "select", required: true, optionsFrom: leaveTypeOption },
    { name: "startDate", label: "From", type: "date", required: true },
    {
      name: "endDate",
      label: "To",
      type: "date",
      required: true,
      validate: (value, all) =>
        all.startDate && value < all.startDate ? "The end date cannot be before the start date." : undefined,
    },
    { name: "reason", label: "Reason", type: "textarea" },
  ],
};
