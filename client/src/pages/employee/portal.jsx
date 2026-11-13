import PortalLayout, { useEmployeeMe } from "../../components/employee/PortalLayout";

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const details = (me) => [
  { label: "Email", value: me.email },
  { label: "Position", value: me.position },
  { label: "Department", value: me.department },
];

/**
 * The employee home page: a red gradient welcome card (the same gradient as the login side panel)
 * and the employee's details in the left column, updates on the right (7/5).
 */
export default function EmployeePortal() {
  const { data: me } = useEmployeeMe();

  return (
    <PortalLayout>
      <div className="portal-columns">
        <div className="portal-column">
          <section className="portal-welcome">
            <p className="portal-welcome-kicker">{greeting()}</p>
            <h1 className="portal-welcome-title">{me ? `Welcome, ${me.first_name}!` : "Welcome!"}</h1>
            <p className="portal-welcome-text">Glad to have you here. Your details are on this page.</p>
          </section>

          <section className="portal-panel" aria-labelledby="portal-details-heading">
            <h2 id="portal-details-heading" className="portal-panel-title">
              My details
            </h2>
            <dl className="portal-details">
              {me &&
                details(me).map(({ label, value }) => (
                  <div key={label} className="portal-detail-row">
                    <dt>{label}</dt>
                    <dd>{value || "—"}</dd>
                  </div>
                ))}
            </dl>
          </section>
        </div>

        <section className="portal-panel portal-updates" aria-labelledby="portal-updates-heading">
          <h2 id="portal-updates-heading" className="portal-panel-title">
            Updates
          </h2>
          <p className="portal-empty">Nothing here yet.</p>
        </section>
      </div>
    </PortalLayout>
  );
}
