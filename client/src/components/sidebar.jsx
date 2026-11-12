import { Link } from "react-router-dom";
import { initFlowbite } from "flowbite";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { resources } from "../resources";
import SidebarIcon, { resourceIcons } from "./SidebarIcon";

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
    <aside id="default-sidebar" className="fixed top-0 left-0 z-40 w-64 h-screen pt-20 transition-transform -translate-x-full bg-white border-r border-gray-200 sm:translate-x-0" aria-label="default-sidebar">
                    <div className="h-full px-3 pb-4 overflow-y-auto bg-white">
                        <ul className="space-y-2 font-medium">
                        <li>
                            <Link to="/employees" className="flex items-center p-2 text-gray-500 rounded-lg  hover:bg-blue-700 hover:text-white group">
                                <SidebarIcon name="home" />
                                
                                <span className="ms-3">Dashboard</span>
                            </Link>
                        </li>
                        <li>
                            <Link to="/employees/add" className="flex items-center p-2 text-gray-500 rounded-lg  hover:bg-blue-700 hover:text-white group">

     
                                <SidebarIcon name="userPlus" />
                                
                                <span className="flex-1 ms-3 whitespace-nowrap">Add Employees</span>
                            </Link>
                        </li>
                        {resources.map((resource) => (
                            <li key={resource.key}>
                                <Link to={resource.basePath} className="flex items-center p-2 text-gray-500 rounded-lg  hover:bg-blue-700 hover:text-white group">
                                    <SidebarIcon name={resourceIcons[resource.key]} />

                                    <span className="flex-1 ms-3 whitespace-nowrap">{resource.title}</span>
                                </Link>
                            </li>
                        ))}
                        <li>
                            <Link to="/login/" onClick={logout} className="flex items-center p-2 text-gray-500 rounded-lg  hover:bg-blue-700 hover:text-white group">
                                <SidebarIcon name="logout" />

                                <span className="flex-1 ms-3 whitespace-nowrap">Logout</span>

                            </Link>
                        </li>
                        </ul>
                    </div>
                </aside>
    </div>
  );
}

export default SideBar;
