import icon from "./assets/icon.png";
import { Link } from "react-router-dom";
import { initFlowbite } from "flowbite";
import { useEffect } from "react";

const Navbar = () => {
  useEffect(() => {
    initFlowbite();
  }, []);

  return (
    <nav className="bg-white body w-full z-20 top-0 p-1 start-0 border-gray-200">
      <div className="max-w-screen-xl flex flex-row flex-wrap items-center justify-between mx-auto p-4">
        <div className="md:order-4">
          <Link to="/">
            <a className="flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse">
              <img src={icon} className="h-10 lg:h-12" alt="ManageMe Logo" />
              <span className="self-center text-blue-700 text-2xl font-semibold whitespace-nowrap">
                ManageMe
              </span>
            </a>
          </Link>
        </div>

        <div className="md:order-2 ">
          <div className="flex order-2 space-x-3 md:space-x-0 rtl:space-x-reverse set-login-and-registration">
            <span className="block cursor-pointer font-medium hover:underline py-2 px-2 text-blue-700 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:dark:hover:text-blue-500 mr-2">
              <Link to="/login" className="hover:underline">
                Login
              </Link>
            </span>
            <Link to="/register" className="hover:underline">
              <button
                type="button"
                className="text-white my-auto cursor-pointer bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-md px-4 py-2 text-center"
              >
                Sign Up
              </button>
            </Link>
          </div>
        </div>

        <button
          data-collapse-toggle="navbar-dropdown"
          type="button"
          class="inline-flex dropdown-button md:order-3 items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          aria-controls="navbar-dropdown"
          aria-expanded="false"
        >
          <span class="sr-only">Open main menu</span>
          <svg
            class="w-5 h-5"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 17 14"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M1 1h15M1 7h15M1 13h15"
            />
          </svg>
        </button>
        <div class="hidden hide-dropdown-md shadow-md w-full md:block md:w-auto" id="navbar-dropdown">
          <ul class="flex flex-col font-medium p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:space-x-8 rtl:space-x-reverse md:flex-row md:mt-0 md:border-0 md:bg-white">
            <li>
              <Link
                to="/login"
                class="block py-2 px-3 bg-blue-700  text-white  rounded-sm md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500"
                aria-current="page"
              >
                Login
              </Link>
            </li>
            <li>
              <Link
                to="/register"
                class="block py-2 px-3 hover:bg-blue-700 hover:text-white text-blue-500 bg-transparent hover:bg-blue-700 rounded-sm md:bg-transparent md:text-blue-700 md:p-0 md:dark:text-blue-500"
              >
                Sign Up
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
