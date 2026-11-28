import {
  useAttendance,
  useAttendancePage,
  useAttendanceRecord,
  useCreateAttendance,
  useUpdateAttendance,
  useRemoveAttendance,
  useEmployees,
  useCan,
} from "../hooks/useEntities";
import { nameOf, lookups } from "./shared";

const employeeOption = { useList: useEmployees, value: (e) => e.id, label: (e) => e.fullName };

const money = (value) =>
  value === undefined || value === null
    ? ""
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const showTime = (value) => (value ? value.replace("T", " ") : "");

// The recorded times must run in order. The server checks too; this just says so before saving.
const TIME_LABELS = { timeIn: "time in", lunchOut: "lunch out", lunchIn: "lunch in", timeOut: "time out" };

const notBefore = (field, label, earlierFields) => (value, all) => {
  if (!value) return undefined;
  const tooEarly = earlierFields.find((earlier) => all[earlier] && value < all[earlier]);
  return tooEarly ? `${label} cannot be before ${TIME_LABELS[tooEarly]}.` : undefined;
};

/**
 * Daily time records: time in, lunch out and in, time out, and the hours worked (worked out by
 * the server). The hourly rate and the pay it earns are salary information: those two columns
 * only exist for HR (salary-rates:view). The form has no rate field, since only HR sets rates.
 */
export const attendanceResource = {
  key: "attendance",
  title: "Attendance",
  singular: "Attendance Record",
  addLabel: "Add Record",
  basePath: "/attendance",
  hooks: {
    useList: useAttendance,
    usePage: useAttendancePage,
    useOne: useAttendanceRecord,
    useCreate: useCreateAttendance,
    useUpdate: useUpdateAttendance,
    useRemove: useRemoveAttendance,
  },
  useExtras: () => ({
    ...lookups({ employees: useEmployees() }),
    canSeeRates: useCan("salary-rates:view").allowed,
  }),
  columns: ({ employees, canSeeRates }) => [
    { key: "employee", header: "Employee", accessor: (r) => nameOf(employees, r.employeeId, (e) => e.fullName) },
    { key: "date", header: "Date", sortKey: "date" },
    { key: "timeIn", header: "Time in", sortKey: "timeIn", render: (r) => showTime(r.timeIn) },
    { key: "lunchOut", header: "Lunch out", render: (r) => showTime(r.lunchOut) },
    { key: "lunchIn", header: "Lunch in", render: (r) => showTime(r.lunchIn) },
    { key: "timeOut", header: "Time out", sortKey: "timeOut", render: (r) => showTime(r.timeOut) },
    {
      key: "hoursWorked",
      header: "Hours",
      sortKey: "hoursWorked",
      render: (r) => (typeof r.hoursWorked === "number" ? r.hoursWorked.toFixed(2) : "Still in"),
    },
    ...(canSeeRates
      ? [
          { key: "hourlyRate", header: "Hourly rate", sortKey: "hourlyRate", render: (r) => money(r.hourlyRate) },
          { key: "pay", header: "Pay", accessor: (r) => r.pay, render: (r) => money(r.pay) },
        ]
      : []),
  ],
  fields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, lockOnEdit: true, optionsFrom: employeeOption },
    { name: "timeIn", label: "Time in", type: "datetime-local", required: true },
    { name: "lunchOut", label: "Lunch out", type: "datetime-local", validate: notBefore("lunchOut", "Lunch out", ["timeIn"]) },
    {
      name: "lunchIn",
      label: "Lunch in",
      type: "datetime-local",
      validate: (value, all) =>
        value && !all.lunchOut ? "Enter the lunch out time first." : notBefore("lunchIn", "Lunch in", ["lunchOut"])(value, all),
    },
    {
      name: "timeOut",
      label: "Time out",
      type: "datetime-local",
      hint: "Leave blank while the employee is still in.",
      validate: notBefore("timeOut", "Time out", ["lunchIn", "lunchOut", "timeIn"]),
    },
  ],
};
