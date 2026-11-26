import { useState } from "react";
import PortalLayout from "../../components/employee/PortalLayout";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { employeePortal } from "../../container";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";

const initialOf = (me) => (me?.first_name?.trim()?.[0] || "?").toUpperCase();

/** The rows of the details card at the bottom of the page. */
const details = (me) => [
  { label: "First name", value: me.first_name },
  { label: "Last name", value: me.last_name },
  { label: "Email", value: me.email },
  { label: "Position", value: me.position },
  { label: "Department", value: me.department },
];

/** The employee's own profile: their name and email, their details, and changing their password. */
export default function EmployeeProfile() {
  const { employee: me, isLoading } = useEmployeeAuth();
  const [changed, setChanged] = useState(false);

  const changePassword = async (passwords) => {
    setChanged(false);
    await employeePortal.changePassword(passwords);
    setChanged(true);
  };

  return (
    <PortalLayout>
      <section className="profile-card" aria-label="Profile">
        <div className="profile-banner" />
        <div className="profile-head">
          <div className="profile-avatar" aria-hidden="true">
            {initialOf(me)}
          </div>
          <div className="profile-identity">
            <h2 className="profile-name">{me ? `${me.first_name} ${me.last_name}` : isLoading ? "Loading…" : "—"}</h2>
            <p className="profile-sub">{me?.email || "—"}</p>
          </div>
          {me && <span className="profile-badge">Active</span>}
        </div>
      </section>

      <section className="portal-panel profile-details-card" aria-labelledby="profile-details-heading">
        <h2 id="profile-details-heading" className="portal-panel-title">
          My details
        </h2>
        {me ? (
          <dl className="portal-details">
            {details(me).map(({ label, value }) => (
              <div key={label} className="portal-detail-row">
                <dt>{label}</dt>
                <dd>{value || "—"}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="portal-empty">{isLoading ? "Loading…" : "Your details could not be loaded."}</p>
        )}
      </section>

      <section className="portal-panel profile-details-card" aria-labelledby="profile-password-heading">
        <h2 id="profile-password-heading" className="portal-panel-title">
          Change password
        </h2>
        <ChangePasswordForm onSubmit={changePassword} />
        {changed && (
          <p className="text-sm text-green-700" role="status">
            Password changed. Use it next time you sign in.
          </p>
        )}
      </section>
    </PortalLayout>
  );
}
