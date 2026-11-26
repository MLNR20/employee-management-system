import {
  useSalaryRates,
  useSalaryRatesPage,
  useSalaryRate,
  useAssignSalaryRate,
  useEmployees,
  useAdministrators,
} from "../hooks/useEntities";
import { nameOf } from "./shared";

const money = (value) =>
  value === undefined || value === null
    ? ""
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Hourly rates per employee. HR only: `permission` hides the sidebar link and the routes for
 * everyone else, and the server refuses their requests anyway. A rate is assigned from a day on
 * and never edited or deleted (no useUpdate / useRemove), so the history of what was paid stays.
 */
export const salaryRateResource = {
  key: "salary-rates",
  title: "Salary Rates",
  singular: "Salary Rate",
  addLabel: "Assign Rate",
  basePath: "/salary-rates",
  permission: "salary-rates:view",
  access: { create: "salary-rates:assign" },
  hooks: {
    useList: useSalaryRates,
    usePage: useSalaryRatesPage,
    useOne: useSalaryRate,
    useCreate: useAssignSalaryRate,
  },
  useExtras: () => ({ employees: useEmployees().data, administrators: useAdministrators().data }),
  columns: ({ employees, administrators }) => [
    { key: "employee", header: "Employee", accessor: (r) => nameOf(employees, r.employeeId, (e) => e.fullName) },
    { key: "hourlyRate", header: "Hourly rate", sortKey: "hourlyRate", render: (r) => money(r.hourlyRate) },
    { key: "effectiveFrom", header: "Effective from", sortKey: "effectiveFrom" },
    {
      key: "assignedBy",
      header: "Assigned by",
      accessor: (r) => (r.assignedBy ? nameOf(administrators, r.assignedBy, (a) => a.fullName) : ""),
    },
    { key: "remarks", header: "Remarks" },
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
      name: "hourlyRate",
      label: "Hourly rate",
      type: "number",
      required: true,
      min: 0,
      validate: (value) => (Number(value) <= 0 ? "Hourly rate must be above 0." : undefined),
    },
    {
      name: "effectiveFrom",
      label: "Effective from",
      type: "date",
      hint: "Leave blank to start today. Attendance before this day keeps the earlier rate.",
    },
    { name: "remarks", label: "Remarks", type: "textarea", maxLength: 200 },
  ],
};
