import { Fragment, useState } from "react";
import PageLayout from "../../components/PageLayout";
import StatCard from "../../components/StatCard";
import { usePayroll } from "../../hooks/useEntities";

const money = (value) =>
  value === undefined || value === null
    ? "-"
    : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const pad = (number) => String(number).padStart(2, "0");
const day = (year, month, date) => `${year}-${pad(month + 1)}-${pad(date)}`;

/**
 * The latest half-month that has finished: the 1st to the 15th once the 16th has come, otherwise the 16th
 * to the end of last month. That is the cut-off HR is normally about to pay.
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

/**
 * HR's payroll view: for a period, each employee's hourly rate, days and hours worked, and gross pay,
 * with the day-by-day records behind the pay one click away. Only administrators with salary-rates:view
 * get here (the route is guarded and the server refuses everyone else).
 */
export default function Payroll() {
  const [period, setPeriod] = useState(lastClosedPeriod);
  const [openId, setOpenId] = useState(null);
  const { data: report, isLoading, error } = usePayroll(period);

  const rows = report?.data ?? [];
  const periodIsValid = period.from && period.to && period.from <= period.to;

  return (
    <PageLayout
      title="Payroll"
      actions={
        <div className="flex items-end gap-3">
          <label className="text-sm text-gray-700">
            <span className="block mb-1">From</span>
            <input
              type="date"
              aria-label="From"
              value={period.from}
              onChange={(e) => setPeriod((p) => ({ ...p, from: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="text-sm text-gray-700">
            <span className="block mb-1">To</span>
            <input
              type="date"
              aria-label="To"
              value={period.to}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
              className={inputClass}
            />
          </label>
        </div>
      }
    >
      <p className="mb-4 text-sm text-gray-500">
        Gross pay is the hours worked each day multiplied by the hourly rate HR assigned for that day. It is
        shown to HR only. Select an employee to see the days behind their pay.
      </p>

      {!periodIsValid && <p className="text-red-600">Choose a start date that is not after the end date.</p>}

      <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-3">
        <StatCard label="Employees" value={report?.totals.employees ?? "-"} icon="users" />
        <StatCard label="Hours worked" value={report ? money(report.totals.hoursWorked) : "-"} icon="clock" />
        <StatCard label="Gross pay" value={report ? money(report.totals.grossPay) : "-"} icon="banknotes" accent="green" />
      </div>

      {isLoading && periodIsValid && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error.response?.data?.message ?? "Could not load the payroll."}</p>}

      {report && (
        <table className="w-full text-sm text-left text-gray-500">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Employee</th>
              <th className="px-4 py-3 text-right">Hourly rate</th>
              <th className="px-4 py-3 text-right">Days</th>
              <th className="px-4 py-3 text-right">Hours</th>
              <th className="px-4 py-3 text-right">Late (min)</th>
              <th className="px-4 py-3 text-right">Gross pay</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center">
                  No employees to show for this period.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const isOpen = openId === row.employeeId;
              return (
                <Fragment key={row.employeeId}>
                  <tr
                    className="bg-white border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => setOpenId(isOpen ? null : row.employeeId)}
                    aria-expanded={isOpen}
                  >
                    <td className="px-4 py-3">
                      <span className="block font-medium text-gray-900">{row.employeeName}</span>
                      <span className="block text-xs text-gray-500">{row.email}</span>
                    </td>
                    <td className="px-4 py-3 text-right">{row.hourlyRate === null ? "Not set" : money(row.hourlyRate)}</td>
                    <td className="px-4 py-3 text-right">{row.daysWorked}</td>
                    <td className="px-4 py-3 text-right">{money(row.hoursWorked)}</td>
                    <td className="px-4 py-3 text-right">{row.lateMinutes}</td>
                    <td className="px-4 py-3 font-semibold text-right text-gray-900">{money(row.grossPay)}</td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-gray-50 border-b">
                      <td colSpan={6} className="px-4 py-3">
                        {row.days.length === 0 ? (
                          <p>No attendance records in this period.</p>
                        ) : (
                          <table className="w-full text-xs text-left">
                            <thead className="text-gray-700 uppercase">
                              <tr>
                                <th className="py-2">Date</th>
                                <th className="py-2">Time in</th>
                                <th className="py-2">Time out</th>
                                <th className="py-2 text-right">Hours</th>
                                <th className="py-2 text-right">Rate</th>
                                <th className="py-2 text-right">Late (min)</th>
                                <th className="py-2 text-right">Pay</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.days.map((record) => (
                                <tr key={record.date} className="border-t border-gray-200">
                                  <td className="py-2">{record.date}</td>
                                  <td className="py-2">{showTime(record.timeIn)}</td>
                                  <td className="py-2">{showTime(record.timeOut)}</td>
                                  <td className="py-2 text-right">{record.hoursWorked === null ? "In progress" : money(record.hoursWorked)}</td>
                                  <td className="py-2 text-right">{money(record.hourlyRate)}</td>
                                  <td className="py-2 text-right">{record.lateMinutes}</td>
                                  <td className="py-2 text-right text-gray-900">{money(record.pay)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </PageLayout>
  );
}
