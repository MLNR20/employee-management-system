import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import Card from "../../components/Card";
import StatCard from "../../components/StatCard";
import ExportButtons from "../../components/ExportButtons";
import DataTable from "../../components/datatable/DataTable";
import { useEmployeesPage, useEmployeeSummary, useRemoveEmployee } from "../../hooks/useEntities";
import { useServerTable } from "../../hooks/useServerTable";
import { employeeUseCases } from "../../container";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

const columns = [
  { key: "index", header: "#", sortable: false, searchable: false, render: (_, index) => index + 1 },
  { key: "fullName", header: "Full Name", sortKey: "first_name", accessor: (e) => e.fullName },
  { key: "email", header: "Email", sortKey: "email" },
  { key: "position", header: "Position", sortKey: "position" },
  { key: "salary", header: "Salary", sortKey: "salary" },
  { key: "department", header: "Department", sortKey: "department" },
  {
    key: "isActive",
    header: "Status",
    sortKey: "isActive",
    accessor: (e) => (e.isActive ? "Active" : "Inactive"),
    render: (e) => (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          e.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}
      >
        {e.isActive ? "Active" : "Inactive"}
      </span>
    ),
  },
  {
    key: "hireDate",
    header: "Hire Date",
    sortKey: "hireDate",
    accessor: (e) => (e.hireDate ? new Date(e.hireDate) : undefined),
    render: (e) => (e.hireDate ? new Date(e.hireDate).toLocaleDateString() : ""),
  },
];

const exportTable = (employees) => ({
  filename: "employees",
  title: "Employees",
  headers: ["Full Name", "Email", "Position", "Salary", "Department", "Status", "Hire Date"],
  rows: employees.map((e) => [
    e.fullName,
    e.email,
    e.position,
    e.salary,
    e.department,
    e.isActive ? "Active" : "Inactive",
    e.hireDate ? new Date(e.hireDate).toLocaleDateString() : "",
  ]),
});

export default function View_Employees() {
  const table = useServerTable();
  const { data: page, isLoading, isFetching, error } = useEmployeesPage(table.params);
  const { data: summary } = useEmployeeSummary();
  const removeEmployee = useRemoveEmployee();

  const counts = { total: summary?.total ?? 0, active: summary?.active ?? 0, inactive: summary?.inactive ?? 0 };

  const confirmDelete = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    }).then((result) => {
      if (!result.isConfirmed) return;

      removeEmployee.mutate(id, {
        onSuccess: () =>
          Swal.fire("Employee Deleted!", "The employee has been removed.", "success"),
        onError: (err) => console.log(err),
      });
    });
  };

  const tableColumns = [
    ...columns,
    {
      key: "operations",
      header: "Operations",
      render: (e) => (
        <div className="flex flex-row gap-2">
          <button
            className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5"
            onClick={() => confirmDelete(e.id)}
          >
            Delete
          </button>
          <Link
            to={`/employees/edit/${e.id}`}
            className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5"
          >
            Edit
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 main-content">
        <div className="grid grid-cols-1 gap-6 mt-14 sm:grid-cols-3">
          <StatCard label="Total Employees" value={counts.total} icon="users" />
          <StatCard label="Active" value={counts.active} icon="checkCircle" accent="green" />
          <StatCard label="Inactive" value={counts.inactive} icon="xCircle" accent="red" />
        </div>
        <Card
          title="Employees Management"
          actions={
            <div className="flex flex-row gap-2">
              <Link
                to="/employees/add"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2.5"
              >
                Create Employee
              </Link>
              <ExportButtons getTable={async () => exportTable(await employeeUseCases.list())} />
            </div>
          }
          className="mt-6"
        >
          <DataTable
            columns={tableColumns}
            data={page?.items ?? []}
            total={page?.total ?? 0}
            server={table}
            isLoading={isLoading}
            isFetching={isFetching}
            error={error}
            emptyMessage="No records found."
          />
        </Card>
      </div>
    </div>
  );
}
