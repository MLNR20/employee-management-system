import { NavLink } from "react-router-dom";
import icon from "../../pages/assets/icon.png";
import SidebarIcon from "../SidebarIcon";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";

const links = [
  { to: "/employee", label: "Home", icon: "home", end: true },
  { to: "/employee/leave", label: "Leave", icon: "calendar" },
  { to: "/employee/equipment", label: "Equipment", icon: "box" },
];

/**
 * The frame of every employee page: top bar and the left sidebar. Signing out clears the session,
 * and EmployeeProtectedRoute then sends the employee to /employee/login.
 */
export default function PortalLayout({ children }) {
  const { employee: me, logout: signOut } = useEmployeeAuth();

  return (
    <div className="portal-shell">
      <nav className="portal-topbar">
        <div className="portal-brand">
          <img src={icon} className="portal-logo" alt="Gallium31 logo" />
          <span className="portal-brand-name">Gallium31 Employee Portal</span>
        </div>
        <span className="portal-user">{me ? `${me.first_name} ${me.last_name}` : ""}</span>
      </nav>

      <div className="portal-body">
        <aside className="portal-sidebar" aria-label="Employee navigation">
          <div>
            <p className="portal-nav-heading">Employee</p>
            <ul className="portal-nav">
              {links.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) => `portal-nav-link${isActive ? " portal-nav-link-active" : ""}`}
                  >
                    <SidebarIcon name={link.icon} />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <ul className="portal-logout-wrap">
            <li>
              <button type="button" onClick={signOut} className="portal-nav-link portal-logout">
                <SidebarIcon name="logout" />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </aside>

        <main className="portal-main" aria-label="Employee portal">
          {children}
        </main>
      </div>
    </div>
  );
}
