import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import DataTable from "../../components/datatable/DataTable";
import { usePayroll } from "../../hooks/useEntities";

const money = (value) =>
  value === undefined || value === null
    ? "-"
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pad = (number) => String(number).padStart(2, "0");
const day = (year, month, date) => `${year}-${pad(month + 1)}-${pad(date)}`;

/** The first month the payroll schedule covers. */
const SCHEDULE_START = { year: 2026, month: 9 }; // October

const periodLabel = ({ from, to }) => {
  const start = new Date(`${from}T00:00:00`);
  const month = start.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return `${month} ${start.getDate()}-${new Date(`${to}T00:00:00`).getDate()}`;
};

/**
 * The payroll schedule: every month is paid in two cut-offs, the 1st to the 15th and the 16th to the
 * end of the month. Lists every cut-off that has started, from SCHEDULE_START to today, newest first.
 */
export function payrollSchedule(today = new Date()) {
  const periods = [];
  let year = SCHEDULE_START.year;
  let month = SCHEDULE_START.month;
  while (year < today.getFullYear() || (year === today.getFullYear() && month <= today.getMonth())) {
    const lastDay = new Date(year, month + 1, 0).getDate();
    const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
    periods.push({ from: day(year, month, 1), to: day(year, month, 15) });
    if (!isCurrentMonth || today.getDate() >= 16) periods.push({ from: day(year, month, 16), to: day(year, month, lastDay) });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return periods.reverse().map((period) => ({ ...period, id: `${period.from}_${period.to}`, label: periodLabel(period) }));
}

/**
 * The latest cut-off that has finished: the 1st to the 15th once the 16th has come, otherwise the 16th
 * to the end of last month. That is the one HR is normally about to pay.
 */
export function lastClosedPeriod(today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (today.getDate() >= 16) return { from: day(year, month, 1), to: day(year, month, 15) };

  const previous = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  return { from: day(previous.getFullYear(), previous.getMonth(), 16), to: day(previous.getFullYear(), previous.getMonth(), lastDay) };
}

const showTime = (value) =>
  value ? new Date(value).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }) : "-";

const inputClass = "bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5";


const columns = [
  { key: "index", header: "#", sortable: false, searchable: false, render: (_, index) => index + 1 },
  {
    key: "employeeName",
    header: "Employee",
    render: (row) => (
      <>
        <span className="block font-medium text-gray-900">{row.employeeName}</span>
        <span className="block text-xs text-gray-500">{row.email}</span>
      </>
    ),
  },
  { key: "department", header: "Department", render: (row) => row.department || "—" },
  {
    key: "hourlyRate",
    header: "Hourly Rate",
    render: (row) => (row.hourlyRate === null ? "Not set" : money(row.hourlyRate)),
  },
  { key: "daysWorked", header: "Days" },
  { key: "hoursWorked", header: "Hours", render: (row) => money(row.hoursWorked) },
  { key: "lateMinutes", header: "Late (min)" },
  { key: "grossPay", header: "Gross Pay", render: (row) => money(row.grossPay) },
  { key: "totalDeductions", header: "Deductions", render: (row) => money(row.totalDeductions) },
  { key: "netPay", header: "Net Pay", render: (row) => <span className="font-semibold text-gray-900">{money(row.netPay)}</span> },
];

/**
 * HR's payroll view, laid out like Employees Management: stat cards, then a searchable, sortable,
 * paged table with each employee's hourly rate, days and hours worked and gross pay. "View days" shows
 * the day-by-day records behind one employee's pay. Only administrators with salary-rates:view get here
 * (the route is guarded and the server refuses everyone else).
 */
export default function Payroll() {
  const schedule = payrollSchedule();
  const [periodId, setPeriodId] = useState(() => {
    const closed = lastClosedPeriod();
    return `${closed.from}_${closed.to}`;
  });
  const [openId, setOpenId] = useState(null);
  const selected = schedule.find((item) => item.id === periodId) ?? schedule[0];
  const period = { from: selected.from, to: selected.to };
  const { data: report, isLoading, isPlaceholderData, error } = usePayroll(period);

  const rows = report?.data ?? [];
  const open = rows.find((row) => row.employeeId === openId);

  const tableColumns = [
    ...columns,
    {
      key: "days",
      header: "Records",
      sortable: false,
      searchable: false,
      render: (row) => (
        <button
          type="button"
          className="text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-4 py-2"
          aria-expanded={openId === row.employeeId}
          onClick={() => setOpenId(openId === row.employeeId ? null : row.employeeId)}
        >
          {openId === row.employeeId ? "Hide days" : "View days"}
        </button>
      ),
    },
  ];

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 main-content">
        <div className="grid grid-cols-1 gap-6 mt-14 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Employees" value={report?.totals.employees ?? "-"} icon="users" />
          <StatCard label="Hours worked" value={report ? money(report.totals.hoursWorked) : "-"} icon="clock" />
          <StatCard label="Gross pay" value={report ? money(report.totals.grossPay) : "-"} icon="banknotes" accent="green" />
          <StatCard label="Net pay" value={report ? money(report.totals.netPay) : "-"} icon="banknotes" accent="green" />
        </div>

        <Card
          title="Payroll"
          className="mt-6"
          actions={
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>Payroll period</span>
              <select
                aria-label="Payroll period"
                value={selected.id}
                onChange={(e) => {
                  setPeriodId(e.target.value);
                  setOpenId(null);
                }}
                className={inputClass}
              >
                {schedule.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          }
        >
          <p className="mb-4 text-sm text-gray-500">
            Gross pay is the hours worked each day multiplied by the hourly rate HR assigned for that day. Net pay is gross
            pay less the{" "}
            <Link to="/payroll-deductions" className="text-blue-700 hover:underline">
              deductions
            </Link>{" "}
            in force now. Shown to HR only.
          </p>
          <DataTable
            columns={tableColumns}
            data={rows}
            getRowId={(row) => row.employeeId}
            isLoading={isLoading}
            isRendering={isPlaceholderData}
            error={error}
            pageSizeOptions={[7, 10, 25]}
            initialPageSize={7}
            emptyMessage="No employees to show for this period."
          />
        </Card>

        {open && (
          <Card title={`${open.employeeName}: days in ${selected.label}`} className="mt-6">
            <p className="mb-4 text-sm text-gray-700">
              {open.deductions.length === 0
                ? "No deductions."
                : `Deductions: ${open.deductions.map((d) => `${d.name} ${money(d.amount)}`).join(", ")}.`}
            </p>
            {open.days.length === 0 ? (
              <p className="text-sm text-gray-500">No attendance records in this period.</p>
            ) : (
              <table className="w-full text-sm text-left text-gray-500">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Time in</th>
                    <th className="px-6 py-3">Time out</th>
                    <th className="px-6 py-3">Hours</th>
                    <th className="px-6 py-3">Rate</th>
                    <th className="px-6 py-3">Late (min)</th>
                    <th className="px-6 py-3">Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {open.days.map((record) => (
                    <tr key={record.date} className="odd:bg-white even:bg-gray-50">
                      <td className="px-6 py-4">{record.date}</td>
                      <td className="px-6 py-4">{showTime(record.timeIn)}</td>
                      <td className="px-6 py-4">{showTime(record.timeOut)}</td>
                      <td className="px-6 py-4">{record.hoursWorked === null ? "In progress" : money(record.hoursWorked)}</td>
                      <td className="px-6 py-4">{money(record.hourlyRate)}</td>
                      <td className="px-6 py-4">{record.lateMinutes}</td>
                      <td className="px-6 py-4 text-gray-900">{money(record.pay)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
