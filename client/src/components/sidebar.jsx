import { Link, NavLink } from "react-router-dom";
import { initFlowbite } from "flowbite";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { resources } from "../resources";
import SidebarIcon, { resourceIcons } from "./SidebarIcon";

// Sidebar categories. Resources (see resources/index.js) are placed by key; any resource
// not listed here still appears, under "More", so a new resource is never hidden.
const resourceLink = (resource) => ({
  to: resource.basePath,
  label: resource.title,
  icon: resourceIcons[resource.key],
});

const sectionKeys = [
  { label: "Organization", keys: ["departments", "roles", "role-assignments"] },
  { label: "Leave Management", keys: ["leave-requests", "leave-balances", "leave-types"] },
  { label: "Assets", keys: ["inventory"] },
  { label: "Administration", keys: ["audit-logs"] },
];

const sections = [
  {
    label: "Employees",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: "home" },
      { to: "/employees", label: "Employees", icon: "users" },
    ],
  },
  ...sectionKeys.map(({ label, keys }) => ({
    label,
    items: keys.map((key) => resources.find((r) => r.key === key)).filter(Boolean).map(resourceLink),
  })),
];

const placed = new Set(sectionKeys.flatMap(({ keys }) => keys));
const unplaced = resources.filter((r) => !placed.has(r.key));
if (unplaced.length) sections.push({ label: "More", items: unplaced.map(resourceLink) });

const SideBar=()=> {

  const { logout } = useAuth();

  // The sidebar is on every signed-in page, so it sets their light gray backdrop on <body>
  // (the login and landing pages never render it, so they keep their own backgrounds).
  useEffect(() => {
    document.body.classList.add("bg-gray-100");
    return () => document.body.classList.remove("bg-gray-100");
  }, []);

  useEffect(() => {
    initFlowbite();
    console.log("Flowbite dropdown reinitialized");
  }, []);

  return (
    <div>
    <button data-drawer-target="default-sidebar" data-drawer-toggle="default-sidebar" aria-controls="default-sidebar" type="button" className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"><span className="sr-only">Open sidebar</span><svg className="w-6 h-6" aria-hidden="true" fill-rule="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" fill-rule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path></svg></button>
    <aside id="default-sidebar" className="app-sidebar fixed top-0 left-0 z-40 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0" aria-label="default-sidebar">
                    <div className="h-full px-3 pb-4 overflow-y-auto bg-white flex flex-col justify-between">
                        <div className="space-y-6">
                        {sections.map((section) => (
                            <div key={section.label}>
                                <p className="sidebar-heading px-2 mb-2 text-xs font-semibold tracking-wider text-gray-400 uppercase">{section.label}</p>
                                <ul className="space-y-1 font-medium">
                                {section.items.map((item) => (
                                    <li key={item.to}>
                                        <NavLink
                                            to={item.to}
                                            title={item.label}
                                            // The page you are on keeps the same light gray as a hovered link.
                                            className={({ isActive }) =>
                                                `sidebar-link flex items-center p-2 rounded-lg hover:bg-gray-100 group ${isActive ? "bg-gray-100 text-gray-900" : "text-gray-500"}`
                                            }
                                        >
                                            <SidebarIcon name={item.icon} />
                                            <span className="sidebar-label flex-1 ms-3 whitespace-nowrap">{item.label}</span>
                                        </NavLink>
                                    </li>
                                ))}
                                </ul>
                            </div>
                        ))}
                        </div>
                        <ul className="pt-4 mt-4 border-t border-gray-200 font-medium">
                        <li>
                            <Link to="/login/" onClick={logout} title="Logout" className="sidebar-link flex items-center p-2 text-red-600 rounded-lg hover:bg-gray-100 group">
                                <SidebarIcon name="logout" />

                                <span className="sidebar-label flex-1 ms-3 whitespace-nowrap">Logout</span>

                            </Link>
                        </li>
                        </ul>
                    </div>
                </aside>
    </div>
  );
}

export default SideBar;
