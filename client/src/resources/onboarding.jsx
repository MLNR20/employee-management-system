import {
  useWorkShifts,
  useWorkShiftsPage,
  useWorkShift,
  useCreateWorkShift,
  useUpdateWorkShift,
  useRemoveWorkShift,
  useShiftAssignments,
  useShiftAssignmentsPage,
  useShiftAssignment,
  useCreateShiftAssignment,
  useRemoveShiftAssignment,
  useDocumentRequirements,
  useDocumentRequirementsPage,
  useDocumentRequirement,
  useCreateDocumentRequirement,
  useUpdateDocumentRequirement,
  useRemoveDocumentRequirement,
  useEmployees,
  useAdministrators,
} from "../hooks/useEntities";
import { WEEKDAYS, describeDays, describeHours } from "../domain/shift/WorkShift";
import { statusColumn, Badge, nameOf } from "./shared";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const yesNoTones = { yes: "bg-blue-100 text-blue-700", no: "bg-gray-100 text-gray-700" };

// --- Work shifts ---------------------------------------------------------------------------------

export const workShiftResource = {
  key: "work-shifts",
  title: "Work Shifts",
  singular: "Work Shift",
  basePath: "/work-shifts",
  // Deleting a shift is a soft delete on the server: it only hides the shift.
  deleteNote: "The shift is removed from the list and can no longer be assigned. Past schedules and attendance keep it.",
  hooks: {
    useList: useWorkShifts,
    usePage: useWorkShiftsPage,
    useOne: useWorkShift,
    useCreate: useCreateWorkShift,
    useUpdate: useUpdateWorkShift,
    useRemove: useRemoveWorkShift,
  },
  columns: () => [
    { key: "name", header: "Shift", sortKey: "name" },
    { key: "hours", header: "Hours", sortKey: "startTime", accessor: describeHours },
    { key: "lunchMinutes", header: "Lunch", sortKey: "lunchMinutes", accessor: (s) => `${s.lunchMinutes} min` },
    { key: "graceMinutes", header: "Grace", sortKey: "graceMinutes", accessor: (s) => `${s.graceMinutes} min` },
    { key: "workDays", header: "Days", sortable: false, accessor: (s) => describeDays(s.workDays) },
    statusColumn(),
  ],
  fields: [
    { name: "name", label: "Shift name", type: "text", required: true, hint: "Every shift name is unique." },
    {
      name: "startTime",
      label: "Starts",
      type: "time",
      required: true,
      pattern: TIME,
      patternMessage: "Enter a time like 08:00.",
    },
    {
      name: "endTime",
      label: "Ends",
      type: "time",
      required: true,
      pattern: TIME,
      patternMessage: "Enter a time like 17:00.",
      hint: "An end earlier than the start means the shift runs overnight.",
      validate: (value, all) => (value && value === all.startTime ? "Start and end cannot be the same." : undefined),
    },
    { name: "lunchMinutes", label: "Lunch break (minutes)", type: "number", min: 0, max: 240, default: 60 },
    {
      name: "graceMinutes",
      label: "Grace period (minutes)",
      type: "number",
      min: 0,
      max: 120,
      default: 0,
      hint: "How long after the start still counts as on time.",
    },
    {
      name: "workDays",
      label: "Working days",
      type: "checkboxes",
      required: true,
      default: [1, 2, 3, 4, 5],
      options: WEEKDAYS,
      wide: true,
      hint: "Another shift cannot have the same hours, lunch and days.",
    },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};

// --- Shift schedule: who works which shift from when ---------------------------------------------

// Added and removed, never edited: to move someone, add a new row with a later date.
export const shiftAssignmentResource = {
  key: "shift-assignments",
  title: "Shift Schedules",
  singular: "Shift Schedule",
  basePath: "/shift-assignments",
  hooks: {
    useList: useShiftAssignments,
    usePage: useShiftAssignmentsPage,
    useOne: useShiftAssignment,
    useCreate: useCreateShiftAssignment,
    useRemove: useRemoveShiftAssignment,
  },
  useExtras: () => ({
    employees: useEmployees().data,
    shifts: useWorkShifts().data,
    administrators: useAdministrators().data,
  }),
  columns: ({ employees, shifts, administrators }) => [
    { key: "employee", header: "Employee", accessor: (a) => nameOf(employees, a.employeeId, (e) => e.fullName) },
    { key: "shift", header: "Shift", accessor: (a) => nameOf(shifts, a.shiftId, (s) => `${s.name} (${describeHours(s)})`) },
    { key: "effectiveFrom", header: "From", sortKey: "effectiveFrom", accessor: (a) => a.effectiveFrom },
    { key: "assignedBy", header: "Assigned by", accessor: (a) => nameOf(administrators, a.assignedBy, (x) => x.fullName) },
  ],
  fields: [
    {
      name: "employeeId",
      label: "Employee",
      type: "select",
      required: true,
      optionsFrom: { useList: useEmployees, value: (e) => e.id, label: (e) => e.fullName },
    },
    {
      name: "shiftId",
      label: "Shift",
      type: "select",
      required: true,
      optionsFrom: { useList: useWorkShifts, value: (s) => s.id, label: (s) => `${s.name} (${describeHours(s)}, ${describeDays(s.workDays)})` },
    },
    {
      name: "effectiveFrom",
      label: "Starts on",
      type: "date",
      hint: "Leave blank to start today. The shift on any day is the latest one that started on or before it.",
    },
  ],
};

// --- Document requirements: the lines of the onboarding checklist --------------------------------

export const documentRequirementResource = {
  key: "document-requirements",
  title: "Document Requirements",
  singular: "Document Requirement",
  basePath: "/document-requirements",
  deleteNote: "A requirement that employees already have documents for cannot be deleted. Mark it inactive instead.",
  hooks: {
    useList: useDocumentRequirements,
    usePage: useDocumentRequirementsPage,
    useOne: useDocumentRequirement,
    useCreate: useCreateDocumentRequirement,
    useUpdate: useUpdateDocumentRequirement,
    useRemove: useRemoveDocumentRequirement,
  },
  columns: () => [
    { key: "name", header: "Document", sortKey: "name" },
    { key: "description", header: "What to bring", sortKey: "description" },
    {
      key: "isRequired",
      header: "Required",
      sortKey: "isRequired",
      accessor: (r) => (r.isRequired ? "Required" : "Optional"),
      render: (r) => <Badge value={r.isRequired ? "yes" : "no"} tones={yesNoTones} />,
    },
    {
      key: "hasExpiry",
      header: "Expires",
      sortKey: "hasExpiry",
      accessor: (r) => (r.hasExpiry ? "Expires" : "No"),
      render: (r) => <Badge value={r.hasExpiry ? "yes" : "no"} tones={yesNoTones} />,
    },
    statusColumn(),
  ],
  fields: [
    { name: "name", label: "Document", type: "text", required: true, hint: "Every document name is unique." },
    { name: "description", label: "What to bring", type: "textarea" },
    { name: "isRequired", label: "Required (an optional document does not block the checklist)", type: "checkbox", default: true },
    { name: "hasExpiry", label: "Expires (its expiry date must be recorded before it can be verified)", type: "checkbox", default: false },
    { name: "isActive", label: "Active (shown on every employee's checklist)", type: "checkbox", default: true },
  ],
};
