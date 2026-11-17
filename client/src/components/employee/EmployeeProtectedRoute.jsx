import { Navigate } from "react-router-dom";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";

/** Sends anyone without an employee sign-in to the employee login. */
export default function EmployeeProtectedRoute({ children }) {
  const { isAuthenticated } = useEmployeeAuth();

  if (!isAuthenticated) return <Navigate to="/employee/login" replace />;
  return children;
}
