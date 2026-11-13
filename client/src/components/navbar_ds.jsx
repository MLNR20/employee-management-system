import { Link } from 'react-router-dom';
import icon from './assets/icon.png';
import { useAuth } from '../context/AuthContext';
import { useSidebarCollapse } from '../hooks/useSidebarCollapse';
import SidebarIcon from './SidebarIcon';

const Navbars=() =>{

    const { administrator } = useAuth();
    const { collapsed, toggle } = useSidebarCollapse();

    const first_name = administrator?.first_name ?? "";
    const last_name = administrator?.last_name ?? "";

  return (

    <nav className="bg-white border-b border-gray-200 px-4 py-4  fixed left-0 right-0 top-0 z-50">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex justify-start items-center">
            {/* Desktop only (index.css): collapses the sidebar to icons. Phones use the drawer button below. */}
            <button
              type="button"
              onClick={toggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-pressed={collapsed}
              aria-controls="default-sidebar"
              className="sidebar-toggle items-center p-2 mr-2 text-gray-500 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <SidebarIcon name="menu" />
            </button>
            <button data-drawer-target="default-sidebar" data-drawer-toggle="default-sidebar" aria-controls="default-sidebar" type="button" className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"><span className="sr-only">Open sidebar</span><svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path></svg></button>
        
          <Link to="/" className="flex items-center justify-between mr-4">
            <img src={icon} className="mr-3 ml-3 h-10" alt="Gallium31 logo"/>
            <span className="self-center text-xl font-semibold text-gray-500 whitespace-nowrap hidden  sm:hidden lg:block">Gallium31 Employee Management System</span>
          </Link>
        </div>
        <div className="flex items-center lg:order-2">
            <h1 className="font-semibold">{first_name + " " + last_name}</h1>
        </div>
      </div>
    </nav>

  
  )
}

export default Navbars