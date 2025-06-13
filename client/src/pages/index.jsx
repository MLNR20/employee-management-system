import image from "./assets/person.png";
import Navbar from "../components/navbar";
import {Link} from "react-router-dom";
function Home() {


  return (
    <div>

      <Navbar/>
      <div className="background-demo">
        <div className="gradient-bg">
          <div className="content">

          <div className="py-8 px-4 mx-auto max-w-screen-xl text-center lg:py-16 lg:px-12 transform-text-landing">
            <Link
              to="/"
              className="inline-flex justify-between items-center py-2.5 px-3  mb-6 text-sm text-blue-700 bg-blue-100 rounded-full"
              role="alert"
            >
            
              <span className="text-sm font-medium">
                Welcome To
              </span>
           
            </Link>
            <h1 className="mb-4 text-4xl font-extrabold tracking-tight leading-none text-blue-700 md:text-5xl lg:text-6xl">
              Welcome to ManageMe
            </h1>
            <p className="mb-8 md:text-lg font-normal text-gray-500 lg:text-xl sm:text-md sm:px-16 xl:px-48 dark:text-gray-400">
              You're one and only website in managing your employees <br className="sm:hidden md:block"/>
              and co-workers through the power of the Internet.
            </p>
            <div className="flex flex-col z-20 mb-8 lg:mb-16 space-y-4 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-4">
              <Link to="/register/"
                className="inline-flex justify-center items-center py-3 px-5 text-base font-medium text-center text-white rounded-lg bg-blue-700 hover:bg-blue-800"
              >
                Get Started
                <svg
                  className="ml-2 -mr-1 w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fill-rule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clip-rule="evenodd"
                  ></path>
                </svg>
              </Link>
              <Link
               to="/login/"
                className="inline-flex z-20 justify-center items-center py-3 px-5 text-base font-medium text-center text-gray-700 rounded-lg border border-gray-400"
              >
                <svg
                  className="mr-2 -ml-1 w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"></path>
                </svg>
                Get Managin!
              </Link>
            </div>
           </div>
          </div>

          <img src={image} alt="Team" className="team-image" />
        </div>
      </div>

    </div>


  );
}

export default Home;
