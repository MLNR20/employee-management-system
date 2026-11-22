import { NavLink } from "react-router-dom";
import icon from "../../pages/assets/icon.png";
import SidebarIcon from "../SidebarIcon";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useSidebarCollapse } from "../../hooks/useSidebarCollapse";

const links = [
  { to: "/employee", label: "Home", icon: "home", end: true },
  { to: "/employee/profile", label: "Profile", icon: "idCard" },
  { to: "/employee/attendance", label: "Attendance", icon: "clock" },
  { to: "/employee/leave", label: "Leave", icon: "calendar" },
  { to: "/employee/equipment", label: "Equipment", icon: "box" },
];

/**
 * The frame of every employee page: top bar and the left sidebar. Signing out clears the session,
 * and EmployeeProtectedRoute then sends the employee to /employee/login.
 */
export default function PortalLayout({ children }) {
  const { employee: me, logout: signOut } = useEmployeeAuth();
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <div className="portal-shell">
      <nav className="portal-topbar">
        <div className="portal-brand">
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="portal-toggle"
          >
            <SidebarIcon name="menu" />
          </button>
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
                    title={link.label}
                    className={({ isActive }) => `portal-nav-link${isActive ? " portal-nav-link-active" : ""}`}
                  >
                    <SidebarIcon name={link.icon} />
                    <span className="portal-nav-label">{link.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
          <ul className="portal-logout-wrap">
            <li className="portal-collapse">
              <button
                type="button"
                onClick={toggle}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!collapsed}
                className="portal-nav-link"
              >
                <span className={`portal-collapse-icon${collapsed ? " portal-collapse-icon-flipped" : ""}`}>
                  <SidebarIcon name="chevronLeft" />
                </span>
                <span className="portal-nav-label">{collapsed ? "Expand" : "Collapse"}</span>
              </button>
            </li>
            <li>
              <button type="button" onClick={signOut} title="Logout" className="portal-nav-link portal-logout">
                <SidebarIcon name="logout" />
                <span className="portal-nav-label">Logout</span>
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
