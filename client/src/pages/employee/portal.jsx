import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate } from "react-router-dom";
import icon from "../assets/icon.png";
import { employeePortal } from "../../container";

/**
 * The employee view, for now an empty page. Only the top bar is here: the logo, the signed-in
 * employee's name and Logout. Anyone without an employee sign-in is sent to /employee/login.
 */
export default function EmployeePortal() {
  const navigate = useNavigate();
  const { data: me, isError } = useQuery({
    queryKey: ["employee-portal", "me"],
    queryFn: employeePortal.getMe,
    enabled: employeePortal.isSignedIn(),
    retry: false,
  });

  // No token, or the server turned it down (expired, wrong kind): back to the login.
  if (!employeePortal.isSignedIn() || isError) return <Navigate to="/employee/login" replace />;

  const signOut = () => {
    employeePortal.logout();
    navigate("/employee/login", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <nav className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex flex-wrap justify-between items-center">
          <div className="flex items-center">
            <img src={icon} className="mr-3 ml-3 h-10" alt="Gallium31 logo" />
            <span className="self-center text-xl font-semibold text-gray-500 whitespace-nowrap">
              Gallium31 Employee Portal
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold">{me ? `${me.first_name} ${me.last_name}` : ""}</span>
            <button
              type="button"
              onClick={signOut}
              className="text-red-600 hover:bg-gray-100 font-medium rounded-lg text-sm px-4 py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main aria-label="Employee portal" />
    </div>
  );
}
