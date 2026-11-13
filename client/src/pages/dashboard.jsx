import { useState } from "react";
import Navbar_DS from "../components/navbar_ds";
import SideBar from "../components/sidebar";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import LineChart from "../components/LineChart";
import { useDashboardSummary, useDashboardAttendance } from "../hooks/useEntities";

// Categorical slots 1 and 2 of the reference palette: an adjacent pair that stays apart for colour-blind readers.
const series = [
  { key: "present", label: "Present", color: "#2a78d6" },
  { key: "absent", label: "Absent", color: "#eb6834" },
];

const ranges = [
  { days: 7, label: "Last 7 days" },
  { days: 14, label: "Last 14 days" },
  { days: 30, label: "Last 30 days" },
];

export default function Dashboard() {
  const [days, setDays] = useState(14);
  const { data: summary } = useDashboardSummary();
  const { data: attendance = [], isLoading, error } = useDashboardAttendance(days);

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 sm:ml-64">
        <div className="grid grid-cols-1 gap-6 mt-14 sm:grid-cols-3">
          <StatCard label="Total Employees" value={summary?.total ?? "-"} icon="users" />
          <StatCard label="Present Today" value={summary?.present ?? "-"} icon="checkCircle" accent="green" />
          <StatCard label="Absent Today" value={summary?.absent ?? "-"} icon="xCircle" accent="red" />
        </div>

        <Card
          title="Present vs Absent"
          className="mt-6"
          actions={
            <select
              aria-label="Period"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-2.5"
            >
              {ranges.map((range) => (
                <option key={range.days} value={range.days}>
                  {range.label}
                </option>
              ))}
            </select>
          }
        >
          <p className="mb-4 text-sm text-gray-500">
            Working days only. An employee counts as absent on any day covered by their approved leave; every other
            active employee counts as present.
          </p>
          {isLoading ? (
            <p className="text-sm text-gray-500 p-4">Loading...</p>
          ) : error ? (
            <p className="text-sm text-red-600 p-4">Something went wrong loading the data.</p>
          ) : (
            <LineChart title="Present vs absent employees" series={series} points={attendance} />
          )}
        </Card>
      </div>
    </div>
  );
}
