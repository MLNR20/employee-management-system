import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Success_Bar from "../../components/success_bar";
import { Link, useNavigate } from "react-router-dom";

export default function View_Employees() {

  const [employees, setEmployees] = useState([]);
  var [noOfEmployees, setNoOfEmployees] = useState(0);
  const token = sessionStorage.getItem('token'); // Get token from storage
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
    
  const filteredData = employees.filter((item) => {
    // Create a searchable string that includes concatenated full name + all other values
    const combined = `${item.firstName || ''} ${item.lastName || ''} ` + 
                    Object.values(item)
                      .filter(val => typeof val === 'string' || typeof val === 'number')
                      .join(' ');

    return combined
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .includes(searchTerm.toLowerCase().trim());
  });

  const constDeleteEmployee = (id) => {
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    }).then((result) => {
      if (result.isConfirmed) {
        axios
          .delete(`http://localhost:8080/employees/${id}`,
            {
              headers:{
                Authorization: `Bearer ${token}`
              }
            }
          )
          .then((response) => {
           setEmployees((prevEmployees) => {
            const updatedEmployees = prevEmployees.filter(
              (emp) => emp._id !== id
            );
            setNoOfEmployees(updatedEmployees.length); 
            return updatedEmployees;
          });
            Swal.fire("Employee Deleted!", "The employee has been removed.", "success");

          })
          .catch((error) => {
            //alert("An error happened. Please check the console");
          });
      }
    });
  };

  useEffect(() => {
    axios
      .get("http://localhost:8080/employees/", {headers:{Authorization: `Bearer ${token}`}})
      .then((response) => {
        setEmployees(response.data.data);
        setNoOfEmployees(response.data.data.length);

      })
      .catch((error) => {

        if(error.response.status === 403) navigate("/login/");
        console.log(error);
      });
  }, []);

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
                {noOfEmployees > 0 ? (
                  <div>
                    <div className="mb-6 flex flex-row">
                      <label
                        htmlFor="default-input"
                        className="block mb-2 mt-4 text-sm mr-2 font-small text-gray-500"
                      >
                        Search:
                      </label>
                      <input
                        type="text"
                        id="default-input"
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-72 p-2.5 h-10 mt-2"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>

                    <table
                      id="EmployeesTable"
                      className=" text-sm w-full text-left text-gray-500"
                    >
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3">#</th>
                          <th className="px-6 py-3">Full Name</th>
                          <th className="px-6 py-3">Email</th>
                          <th className="px-6 py-3">Position</th>
                          <th className="px-6 py-3">Salary</th>
                          <th className="px-6 py-3">Department</th>
                          <th className="px-6 py-3">Status</th>
                          <th className="px-6 py-3">Hire Date</th>
                          <th className="px-6 py-3">Operations</th>
                        </tr>
                      </thead>
                      <tbody id="table-body">
                        {filteredData.map((employees, index) => (
                          <tr
                            className="odd:bg-white even:bg-gray-50"
                            key={employees._id}
                          >
                            <td className="px-6 py-4">{index + 1}</td>
                            <td className="px-6 py-4">
                              {employees.first_name + " " + employees.last_name}
                            </td>
                            <td className="px-6 py-4 ">{employees.email}</td>
                            <td className="px-6 py-4">{employees.position}</td>
                            <td className="px-6 py-4 ">{employees.salary}</td>
                            <td className="px-6 py-4">{employees.department}</td>
                            <td className="px-6 py-4">
                              {
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    employees.isActive
                                      ? "bg-green-100 text-green-700"
                                      : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {" "}
                                  {employees.isActive ? "Active" : "Inactive"}
                                </span>
                              }
                            </td>
                            <td className="px-6 py-4 ">{employees.hireDate}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-row gap-2">
                                <button
                                  className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5"
                                  onClick={() =>
                                    constDeleteEmployee(employees._id)
                                  }
                                >
                                  Delete
                                </button>
                                <Link to={`/employees/edit/${employees._id}`} className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5">
                                  Edit
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <Success_Bar value={"No records founds."} />
                )}

                
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
