import icon from './assets/icon.png';
import { Link } from 'react-router-dom';


const Navbar = () => {
  return (
    <nav className="bg-white  w-full z-20 top-0 p-1 start-0 border-gray-200">
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">
        <Link to="/">
        <a
          className="flex items-center space-x-2 md:space-x-3 rtl:space-x-reverse"
        >
            
             <img
                src={icon}
                className="h-10 lg:h-12"
                alt="ManageMe Logo"
            />
            <span className="self-center text-blue-700 text-2xl font-semibold whitespace-nowrap">
                ManageMe
            </span>
        </a>
        </Link>

        <div className="flex md:order-2 space-x-3 md:space-x-0 rtl:space-x-reverse">

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
    </nav>
  );
};

export default Navbar;
