import { Link } from "react-router-dom";
import AuthLayout from "../../components/AuthLayout";

/**
 * There is no email sending, so passwords are not reset by the person who forgot them:
 * another administrator does it. This page says so and sends them back to the login.
 */
export default function ForgotPassword() {
  return (
    <AuthLayout>
      <h1 className="text-3xl text-black font-bold mt-12 lg:text-4xl">Forgot password?</h1>
      <p className="text-base font-normal text-gray-500 mt-4 lg:text-xl">
        No problem. Passwords can't be reset from this page.
      </p>

      <ol className="text-base text-gray-900 mt-8 space-y-3" style={{ listStyle: "decimal", paddingLeft: "1.25rem" }}>
        <li>Ask another administrator to reset your password.</li>
        <li>Sign in with the new password they give you.</li>
        <li>Change it to one only you know as soon as you can.</li>
      </ol>

      <Link
        to="/login"
        className="inline-block text-white mt-8 bg-red-700 hover:bg-red-800 px-5 py-3 focus:ring-4 font-medium rounded-lg text-base focus:outline-none"
      >
        Back to login
      </Link>
    </AuthLayout>
  );
}
