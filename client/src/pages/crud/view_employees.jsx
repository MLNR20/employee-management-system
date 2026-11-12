import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import DataTable from "../../components/datatable/DataTable";
import { useEmployees, useRemoveEmployee } from "../../hooks/useEntities";
import Swal from "sweetalert2";
import { Link } from "react-router-dom";

const columns = [
  { key: "index", header: "#", sortable: false, searchable: false, render: (_, index) => index + 1 },
  { key: "fullName", header: "Full Name", accessor: (e) => e.fullName },
  { key: "email", header: "Email" },
  { key: "position", header: "Position" },
  { key: "salary", header: "Salary" },
  { key: "department", header: "Department" },
  {
    key: "isActive",
    header: "Status",
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
    accessor: (e) => (e.hireDate ? new Date(e.hireDate) : undefined),
    render: (e) => (e.hireDate ? new Date(e.hireDate).toLocaleDateString() : ""),
  },
];

export default function View_Employees() {
  const { data: employees = [], isLoading, error } = useEmployees();
  const removeEmployee = useRemoveEmployee();

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
      <div className="p-8 sm:ml-64">
        <div className="p-4 border-2 shadow-lg  bg-white border-gray-200 border-solid rounded-lg mt-14">
          <div className="p-8 mb-4">
            <h1 className="font-bold text-2xl">Employees Management</h1>
            <div className="overflow-auto mt-6 ">
              <div className="relative p-2 overflow-x-auto" id="LogsTableHere">
                <DataTable
                  columns={tableColumns}
                  data={employees}
                  isLoading={isLoading}
                  error={error}
                  emptyMessage="No records found."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
