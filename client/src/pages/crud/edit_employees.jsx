import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import { useState, useEffect} from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, useParams } from "react-router-dom";

export default function Edit_Employees() {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");
  const navigate = useNavigate();

  const [errors, setErrors] = useState({});
  const {id} = useParams();
  const token = sessionStorage.getItem('token'); // Get token from storage


    useEffect(()=>{
        axios.get(`http://localhost:8080/employees/${id}`,{
          headers:{
             Authorization: `Bearer ${token}`
          }
        }).then((response)=>{
            setFirstName(response.data.first_name);
            setLastName(response.data.last_name);
            setEmail(response.data.email);
            setSalary(response.data.salary);
            setDepartment(response.data.department);
            setPosition(response.data.position);
            setStatus(response.data.isActive.toString());
        }).catch((error)=>{
            if(error.message === "Request failed with status code 403") navigate("/login/")
            console.log(error);

        });

    },[])

  const validateForm = () => {
    const newErrors = {};

    if (!first_name)
    {
      newErrors.first_name = "First name is required." ;
    } 
    else if(first_name.length <3)
    {
      newErrors.first_name = "First name must be greater than 2 characters";
    }

    if (!last_name)
    {
      newErrors.last_name = "Last name is required.";
    } 
    else if(last_name.length < 2)
    {
       newErrors.last_name = "Last name must be not be a single character";
    }

    if (!email) {
      newErrors.email = "Email is required.";
    } 
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Enter a valid email address.";
      }
    }

    if (!salary || isNaN(salary) || Number(salary) <= 0) {
      newErrors.salary = "Enter a valid salary.";
    }

    if (!department || department === "Choose a department") {
      newErrors.department = "Please select a department.";
    }

    if (!position || position === "Choose a position") {
      newErrors.position = "Please select a position.";
    }

    if (!status || status === "Choose a status") {
      newErrors.status = "Please select a status.";
    }

    return newErrors;
  };

  const handleEditEmployees = () => {
    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    const employees = {
      first_name,
      last_name,
      email,
      salary,
      department,
      position,
      status,
    };

    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3F7D58",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "OK",
    }).then((result) => {
      if (result.isConfirmed) {
        axios
          .put(`http://localhost:8080/employees/${id}`,employees,
          {headers:
              {
                Authorization: `Bearer ${token}`
              }
          })
          .then(() => {
            Swal.fire({
              title: "Success!",
              text: "Employee successfully updated.",
              icon: "success",
              showCancelButton: true,
              confirmButtonColor: "#3F7D58",
              cancelButtonColor: "#3085d6",
              confirmButtonText: "OK",
            }).then(() => {
              if (result.isConfirmed) {
                navigate("/employees/");
              }
            });
          })
          .catch((error) => {
            console.log(error);
          });
      }
    });
  };

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div className="p-8 sm:ml-64">
        <div className="p-4 border-2 shadow-lg  bg-white border-gray-200 border-solid rounded-lg mt-14">
          <div className="p-8 mb-4">
            <h1 className="font-bold text-2xl">Edit Employees</h1>
            <div className="overflow-auto mt-6 ">
              <div className="relative p-2 overflow-x-auto" id="LogsTableHere">
                <div className="grid gap-6 mb-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="first_name"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      First name
                    </label>
                    <input
                      type="text"
                      id="first_name"
                      value={first_name}
                      onChange={
                        (e) =>{ setFirstName(e.target.value);
                          setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.first_name;
                            return newErrors;
                          });
                        }
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter your first name..."
                      required
                    />
                    {errors.first_name && (
                      <label classNameName="text-sm text-red-500">
                        {errors.first_name}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="last_name"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Last name
                    </label>
                    <input
                      type="text"
                      id="last_name"
                      value={last_name}
                      onChange={(e) => {
                        setLastName(e.target.value)
                        setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.last_name;
                            return newErrors;
                          });
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter your last name..."
                      required
                    />
                     {errors.last_name && (
                      <label classNameName="text-sm text-red-500">
                        {errors.last_name}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="email"
                      className="block mb-2 text-sm font-medium text-gray-900 "
                    >
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) =>{ 
                        setEmail(e.target.value)
                        setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.email;
                            return newErrors;
                          });
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter employee email..."
                      required
                    />
                    {errors.email && (
                      <label classNameName="text-sm text-red-500">
                        {errors.email}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="salary"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Salary
                    </label>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => {
                        setSalary(e.target.value)
                        setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.salary;
                            return newErrors;
                          });
                      }}
                      id="salary"
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter employee salary..."
                      required
                    />
                    {errors.salary && (
                      <label classNameName="text-sm text-red-500">
                        {errors.salary}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="deparment"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Department
                    </label>
                    <select
                      id="department"
                      value={department}
                      onChange={(e) => {
                        setDepartment(e.target.value)
                        setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.department;
                            return newErrors;
                          });
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option selected>Choose a department</option>
                      <option value="Finance and Accounting">
                        Finance and Accounting
                      </option>
                      <option value="Human Resources">Human Resources</option>
                      <option value="Information Technology">
                        Information Technology
                      </option>
                      <option value="Management">Management</option>
                    </select>
                      {errors.department && (
                      <label classNameName="text-sm text-red-500">
                        {errors.department}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="website"
                      className="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Position
                    </label>
                    <select
                      id="position"
                      value={position}
                      onChange={(e) => {
                        setPosition(e.target.value)
                         setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.position;
                            return newErrors;
                          });
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                    >
                      <option selected>Choose a position</option>
                      <optgroup label="Finance and Accounting">
                        <option value="Accountant">Accountant</option>
                        <option value="Financial Analyst">
                          Financial Analyst
                        </option>
                        <option value="Payroll Specialist">
                          Payroll Specialist
                        </option>
                      </optgroup>

                      <optgroup label="Human Resources">
                        <option value="HR Manager">HR Manager</option>
                        <option value="Recruitment Specialist">
                          Recruitment Specialist
                        </option>
                        <option value="Training Coordinator">
                          Training Coordinator
                        </option>
                      </optgroup>

                      <optgroup label="Information Technology">
                        <option value="IT Support Specialist">
                          IT Support Specialist
                        </option>
                        <option value="Network Administrator">
                          Network Administrator
                        </option>
                        <option value="Systems Analyst">Systems Analyst</option>
                      </optgroup>

                      <optgroup label="Management">
                        <option value="Operations Manager">
                          Operations Manager
                        </option>
                        <option value="Project Manager">Project Manager</option>
                        <option value="Executive Assistant">
                          Executive Assistant
                        </option>
                      </optgroup>
                    </select>
                     {errors.position && (
                      <label classNameName="text-sm text-red-500">
                        {errors.position}
                      </label>
                    )}

                  </div>
                </div>

                <label
                  htmlFor="website"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Status
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) =>{
                     setStatus(e.target.value)
                     setErrors((prevErrors) => {
                            const newErrors = { ...prevErrors };
                            delete newErrors.status;
                            return newErrors;
                          });

                  }
                    }
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option selected>Choose a status</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                   {errors.status && (
                      <label classNameName="text-sm text-red-500">
                        {errors.status}
                      </label>
                    )}
                <div>
                    <button
                      type="button"
                      onClick={handleEditEmployees}
                      className="mt-6 focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-4"
                    >
                      Submit
                    </button>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
