import { useState } from "react";
import Navbar_DS from "../components/navbar_ds";
import SideBar from "../components/sidebar";
import Card from "../components/Card";
import StatCard from "../components/StatCard";
import LineChart from "../components/LineChart";
import PieChart from "../components/PieChart";
import UrgentLeaves from "../components/UrgentLeaves";
import PendingTasks from "../components/PendingTasks";
import { ChartSkeleton, ListSkeleton, PieSkeleton } from "../components/Skeleton";
import { LeaveStatus } from "../domain/leave/Leave";
import { useDashboardSummary, useDashboardAttendance, useLeaveRequests } from "../hooks/useEntities";

// Pending is the urgent slice, so it takes the warm colour; the rest are calmer.
const taskStatuses = [
  { key: LeaveStatus.PENDING, label: "Pending", color: "#eb6834" },
  { key: LeaveStatus.APPROVED, label: "Approved", color: "#2a78d6" },
  { key: LeaveStatus.REJECTED, label: "Rejected", color: "#8a5cc2" },
  { key: LeaveStatus.CANCELLED, label: "Cancelled", color: "#9ca3af" },
];

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
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary();
  const { data: attendance = [], isLoading, isPlaceholderData, error } = useDashboardAttendance(days);
  const { data: leaveRequests = [], isLoading: leaveLoading, error: leaveError } = useLeaveRequests();

  const taskSlices = taskStatuses.map((item) => ({
    ...item,
    value: leaveRequests.filter((request) => request.status === item.key).length,
  }));

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 main-content">
        <div className="grid grid-cols-1 gap-6 mt-14 sm:grid-cols-3">
          <StatCard label="Total Employees" value={summary?.total ?? "-"} loading={loadingSummary} icon="users" />
          <StatCard label="Present Today" value={summary?.present ?? "-"} loading={loadingSummary} icon="checkCircle" accent="green" />
          <StatCard label="Absent Today" value={summary?.absent ?? "-"} loading={loadingSummary} icon="xCircle" accent="red" />
        </div>

        <div className="grid grid-cols-1 gap-6 mt-6 xl:grid-cols-5">
          <Card
            title="Present vs Absent"
            className="xl:col-span-3"
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
            {/* Also while another period loads: the days on hand are the previous range's. */}
            {isLoading || isPlaceholderData ? (
              <ChartSkeleton label="Loading the attendance chart" />
            ) : error ? (
              <p className="text-sm text-red-600 p-4">Something went wrong loading the data.</p>
            ) : (
              <LineChart title="Present vs absent employees" series={series} points={attendance} />
            )}
          </Card>

          <div className="flex flex-col gap-6 xl:col-span-2">
            <Card title="Pending Tasks">
              <p className="mb-4 text-sm text-gray-500">Leave requests waiting for a decision.</p>
              {leaveLoading ? (
                <ListSkeleton label="Loading the pending tasks" />
              ) : leaveError ? (
                <p className="text-sm text-red-600 p-4">Something went wrong loading the leave requests.</p>
              ) : (
                <PendingTasks requests={leaveRequests} />
              )}
            </Card>

            <Card title="Urgent Notifications">
              <p className="mb-4 text-sm text-gray-500">Leave approved by a manager that is under way or coming up.</p>
              {leaveLoading ? (
                <ListSkeleton label="Loading the urgent notifications" />
              ) : leaveError ? (
                <p className="text-sm text-red-600 p-4">Something went wrong loading the leave requests.</p>
              ) : (
                <UrgentLeaves requests={leaveRequests} />
              )}
            </Card>
          </div>
        </div>

        <Card title="Urgent Tasks" className="mt-6">
          <p className="mb-4 text-sm text-gray-500">
            All leave requests by status. Pending requests are waiting for a manager's decision.
          </p>
          {leaveLoading ? (
            <PieSkeleton slices={taskStatuses.length} label="Loading the leave chart" />
          ) : (
            <PieChart title="Leave requests by status" slices={taskSlices} />
          )}
        </Card>
      </div>
    </div>
  );
}
