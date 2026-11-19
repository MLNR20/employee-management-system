import Navbar_DS from "../../components/navbar_ds";
import SideBar from "../../components/sidebar";
import { useState } from "react";
import { useCreateEmployee, useSaveEmergencyContacts } from "../../hooks/useEntities";
import Swal from "sweetalert2";
import GovernmentIdFields from "../../components/GovernmentIdFields";
import EmergencyContactFields from "../../components/EmergencyContactFields";
import { newContactRow, validateContactRows } from "../../domain/employee/emergencyContactRules";
import PortalPasswordField, { validatePortalPassword } from "../../components/PortalPasswordField";
import { validateGovernmentIds } from "../../domain/employee/governmentIds";
import { useNavigate } from "react-router-dom";
import { validatePersonName } from "../../validation/personName";
import ManagerSelect from "../../components/ManagerSelect";
import EmploymentTypeSelect from "../../components/EmploymentTypeSelect";

export default function Add_Employees() {
  const [employmentCode, setEmploymentCode] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [salary, setSalary] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [status, setStatus] = useState("");
  const [ids, setIds] = useState({});
  const [portalPassword, setPortalPassword] = useState("");
  const [contacts, setContacts] = useState(() => [newContactRow()]);
  const [contactErrors, setContactErrors] = useState({});
  const [managerId, setManagerId] = useState("");
  const [employmentTypeId, setEmploymentTypeId] = useState("");
  const navigate = useNavigate();
  const createEmployee = useCreateEmployee();
  const saveContacts = useSaveEmergencyContacts();

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    const firstNameError = validatePersonName("First name", first_name);
    if (firstNameError) newErrors.first_name = firstNameError;

    const lastNameError = validatePersonName("Last name", last_name);
    if (lastNameError) newErrors.last_name = lastNameError;

    if (!email) {
      newErrors.email = "Email is required.";
    } 
     else if(email.length < 3)
    {
      newErrors.email = "Email must not be limited to two characters."
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

    Object.assign(newErrors, validateGovernmentIds(ids));
    const passwordError = validatePortalPassword(portalPassword);
    if (passwordError) newErrors.portalPassword = passwordError;

    return newErrors;
  };

  const handleAddEmployees = () => {
    const validationErrors = validateForm();
    const rowErrors = validateContactRows(contacts);
    setErrors(validationErrors);
    setContactErrors(rowErrors);

    if (Object.keys(validationErrors).length > 0 || Object.keys(rowErrors).length > 0) return;

    const employees = {
      employmentCode: employmentCode.trim(),
      first_name,
      last_name,
      email,
      salary,
      department,
      position,
      status,
      managerId,
      employmentTypeId,
      ...ids,
      ...(portalPassword ? { portalPassword } : {}),
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
        createEmployee
          .mutateAsync(employees)
          .then(async (employee) => {
            // The contacts need the new employee's id, so they are saved second. If any fail the
            // employee already exists: say so instead of pretending the whole save worked.
            const failed = await saveContacts({ employeeId: employee.id, contacts });
            const contactsSaved = failed === 0;

            return Swal.fire({
              title: contactsSaved ? "Success!" : "Employee added",
              text: contactsSaved
                ? "Employee successfully added."
                : `The employee was added, but ${failed} emergency contact${failed === 1 ? "" : "s"} could not be saved. Open Edit Employee to add ${failed === 1 ? "it" : "them"} again.`,
              icon: contactsSaved ? "success" : "warning",
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
            // An expired session is already redirected to /login by the API client.
            Swal.fire("Could not save", error.response?.data?.message ?? "Something went wrong.", "error");
          });
      }
    });
  };

  return (
    <div>
      <SideBar />
      <Navbar_DS />
      <div class="p-8 main-content">
        <div class="p-4 border-2 bg-white border-gray-200 border-solid rounded-lg mt-14">
          <div class="p-8 mb-4">
            <h1 class="font-bold text-2xl">Add Employee</h1>
            <div class="overflow-auto mt-6 ">
              <div class="relative p-2 overflow-x-auto" id="LogsTableHere">
                <div class="grid gap-6 mb-6 md:grid-cols-2">
                  <div class="grid gap-6 md:col-span-2 md:grid-cols-3">
                  <div>
                    <label
                      for="employmentCode"
                      class="block mb-2 text-sm font-medium text-gray-900"
                    >
                      Employment code
                    </label>
                    <input
                      type="text"
                      id="employmentCode"
                      value={employmentCode}
                      maxLength={30}
                      onChange={(e) => {
                        setEmploymentCode(e.target.value);
                        setErrors((prevErrors) => {
                          const newErrors = { ...prevErrors };
                          delete newErrors.employmentCode;
                          return newErrors;
                        });
                      }}
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="e.g. EMP-0001"
                    />
                    {errors.employmentCode && (
                      <label className="text-sm text-red-500">
                        {errors.employmentCode}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      for="first_name"
                      class="block mb-2 text-sm font-medium text-gray-900"
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter your first name..."
                      required
                    />
                    {errors.first_name && (
                      <label className="text-sm text-red-500">
                        {errors.first_name}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      for="last_name"
                      class="block mb-2 text-sm font-medium text-gray-900"
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter your last name..."
                      required
                    />
                     {errors.last_name && (
                      <label className="text-sm text-red-500">
                        {errors.last_name}
                      </label>
                    )}
                  </div>
                  </div>
                  <div>
                    <label
                      for="email"
                      class="block mb-2 text-sm font-medium text-gray-900 "
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter employee email..."
                      required
                    />
                    {errors.email && (
                      <label className="text-sm text-red-500">
                        {errors.email}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      for="salary"
                      class="block mb-2 text-sm font-medium text-gray-900"
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 h-12"
                      placeholder="Enter employee salary..."
                      required
                    />
                    {errors.salary && (
                      <label className="text-sm text-red-500">
                        {errors.salary}
                      </label>
                    )}
                  </div>
                  <div>
                    <label
                      for="deparment"
                      class="block mb-2 text-sm font-medium text-gray-900"
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
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
                      <label className="text-sm text-red-500">
                        {errors.department}
                      </label>
                    )}
                  </div>
                  <ManagerSelect value={managerId} onChange={setManagerId} />
                  <EmploymentTypeSelect value={employmentTypeId} onChange={setEmploymentTypeId} />
                  <div>
                    <label
                      for="website"
                      class="block mb-2 text-sm font-medium text-gray-900"
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
                      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
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
                      <label className="text-sm text-red-500">
                        {errors.position}
                      </label>
                    )}

                  </div>
                </div>

                <label
                  for="website"
                  class="block mb-2 text-sm font-medium text-gray-900"
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
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option selected>Choose a status</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
                   {errors.status && (
                      <label className="text-sm text-red-500">
                        {errors.status}
                      </label>
                    )}
                <GovernmentIdFields
                  values={ids}
                  errors={errors}
                  onChange={(name, value) => {
                    setIds((previous) => ({ ...previous, [name]: value }));
                    setErrors((previous) => ({ ...previous, [name]: undefined }));
                  }}
                />
                <EmergencyContactFields
                  rows={contacts}
                  errors={contactErrors}
                  onChange={setContacts}
                  // Typing in one field can change which others are required, so clear that row's errors.
                  onEdit={(key) =>
                    setContactErrors((previous) => {
                      const { [key]: _cleared, ...rest } = previous;
                      return rest;
                    })
                  }
                />
                <PortalPasswordField
                  value={portalPassword}
                  error={errors.portalPassword}
                  hint="Optional. Lets this employee sign in to the employee portal with their email."
                  onChange={(value) => {
                    setPortalPassword(value);
                    setErrors((previous) => ({ ...previous, portalPassword: undefined }));
                  }}
                />
                <div>
                    <button
                      type="button"
                      onClick={handleAddEmployees}
                      class="mt-6 focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-4"
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
