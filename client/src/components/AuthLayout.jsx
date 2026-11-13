import { Link } from "react-router-dom";
import icon from "../pages/assets/icon.png";

/** The shell shared by the signed-out pages: the red side panel, the logo bar and the content area. */
export default function AuthLayout({ children }) {
  return (
    <div>
      <div className="flex h-screen w-100">
        <div className="flex-2 side-login-panel p-8 text-white w-50 hidden sm:block"></div>
        <div className="flex-1 bg-white my-auto p-6 text-white">
          <header>
            <nav className="bg-white w-full border-gray-200 text-gray-900 w-100 mb-8 py-4 px-6">
              <div className="flex flex-wrap justify-between items-left mx-auto max-w-full">
                <Link to="/login" className="flex items-center">
                  <img src={icon} className="mr-3 h-10 sm:h-9" alt="Gallium31 logo" />
                  <span className="self-center text-xl object-cover font-semibold whitespace-nowrap text-gray-500">
                    Gallium31 Employee Management System
                  </span>
                </Link>
              </div>
            </nav>
          </header>

          <div className="login-section p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
