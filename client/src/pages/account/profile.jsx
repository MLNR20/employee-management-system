import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import PageLayout from "../../components/PageLayout";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { useAuth } from "../../context/AuthContext";
import { accountUseCases } from "../../container";

/** The signed-in administrator's profile: who they are, their roles, and changing their password. */
export default function Profile() {
  const { administrator, isLoading, logout } = useAuth();
  const navigate = useNavigate();

  // The server ends every session on a change, so sign out here and ask for the new password.
  const changePassword = async (passwords) => {
    await accountUseCases.changePassword(passwords);
    await Swal.fire({ title: "Password changed", text: "Sign in with your new password.", icon: "success" });
    await logout();
    navigate("/login", { replace: true });
  };

  const details = administrator && [
    { label: "First name", value: administrator.first_name },
    { label: "Last name", value: administrator.last_name },
    { label: "Username", value: administrator.username },
    { label: "Roles", value: administrator.roles.join(", ") || "No role assigned" },
  ];

  return (
    <PageLayout title="My profile">
      {details ? (
        // Inline: the ".portal-details" rule sets its own margin, which would beat a utility class.
        <dl className="portal-details" style={{ maxWidth: "36rem", marginBottom: "2rem" }}>
          {details.map(({ label, value }) => (
            <div key={label} className="portal-detail-row">
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mb-8 text-gray-500">{isLoading ? "Loading..." : "Your details could not be loaded."}</p>
      )}

      <section aria-labelledby="profile-password-heading">
        <h2 id="profile-password-heading" className="mb-1 text-lg font-semibold text-gray-900">
          Change password
        </h2>
        <p className="mb-4 text-sm text-gray-500">Changing your password signs you out everywhere.</p>
        <ChangePasswordForm onSubmit={changePassword} />
      </section>
    </PageLayout>
  );
}
