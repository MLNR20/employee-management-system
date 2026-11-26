import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageLayout from "../../components/PageLayout";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { useAuth } from "../../context/AuthContext";
import { accountUseCases } from "../../container";

/** The signed-in administrator's own account: changing the password. */
export default function Account() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  // The server ends every session on a change, so sign out here and ask for the new password.
  const change = async (passwords) => {
    await accountUseCases.changePassword(passwords);
    await Swal.fire({ title: "Password changed", text: "Sign in with your new password.", icon: "success" });
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <PageLayout title="Change password">
      <p className="mb-4 text-sm text-gray-500">Changing your password signs you out everywhere.</p>
      <ChangePasswordForm onSubmit={change} />
    </PageLayout>
  );
}
