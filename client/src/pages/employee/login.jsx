import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useSnackbar } from "notistack";
import AuthLayout from "../../components/AuthLayout";
import PasswordInput from "../../components/PasswordInput";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { InvalidCredentialsError } from "../../domain/errors";

// Same as the admin login: gray border, red only when the field is invalid.
const inputClass = (hasError) =>
  `bg-gray-50 border text-gray-900 text-base rounded-lg block w-full p-3 ${
    hasError
      ? "border-red-600 focus:ring-red-600 focus:border-red-600"
      : "border-gray-300 focus:ring-gray-400 focus:border-gray-400"
  }`;

/** Employee sign-in: email and the portal password an administrator set. */
export default function EmployeeLogin() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const { isAuthenticated, login } = useEmployeeAuth();

  if (isAuthenticated) return <Navigate to="/employee" replace />;

  const submit = async (event) => {
    event.preventDefault();

    const found = {};
    if (!email.trim()) found.email = "Email field is required.";
    if (!password) found.password = "Password field is required.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate("/employee", { replace: true });
    } catch (error) {
      enqueueSnackbar(
        error instanceof InvalidCredentialsError ? error.message : "Something went wrong. Please try again.",
        { variant: "error" }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const clear = (name) => setErrors((previous) => ({ ...previous, [name]: undefined }));

  return (
    <AuthLayout>
      <h1 className="text-3xl text-black font-bold mt-12 lg:text-4xl">Employee Login</h1>
      <p className="font-normal text-gray-500 mt-4 lg:text-xl">Sign in with your work email and portal password.</p>

      <form onSubmit={submit} noValidate>
        <div className="mb-6 mt-8">
          <label htmlFor="employee-email" className="block mb-2 mt-6 text-base font-medium text-gray-900">
            Email
          </label>
          <input
            type="email"
            id="employee-email"
            name="email"
            autoComplete="username"
            placeholder="Enter your email..."
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              clear("email");
            }}
            className={inputClass(errors.email)}
          />
          {errors.email && <label className="text-sm text-red-500">{errors.email}</label>}
        </div>

        <div className="mb-2">
          <label htmlFor="employee-password" className="block mb-2 text-base font-medium text-gray-900">
            Password
          </label>
          <PasswordInput
            id="employee-password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password..."
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clear("password");
            }}
            className={inputClass(errors.password)}
          />
          {errors.password && <label className="text-sm text-red-500">{errors.password}</label>}
        </div>

        <button
          type="submit"
          disabled={submitting}
          style={{ opacity: submitting ? 0.6 : 1 }}
          className="text-white mt-6 bg-red-700 hover:bg-red-800 px-5 py-3 focus:ring-4 font-medium rounded-lg text-base focus:outline-none"
        >
          {submitting ? "Signing in..." : "Login"}
        </button>
      </form>

      <p className="text-gray-900 mt-6 text-base">
        Not an employee?{" "}
        <Link to="/login" className="font-semibold text-red-700 hover:underline">
          Login as administrator
        </Link>
      </p>
    </AuthLayout>
  );
}
