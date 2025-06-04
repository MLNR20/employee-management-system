import { Link } from "react-router-dom";
import icon from "../assets/icon.png";
import { useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';


function Login() {
  

    const [username, setUsername]  = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const { enqueueSnackbar } = useSnackbar();

    const validateForm = () => {
      const newErrors = {};

      if(!password)
      {
        newErrors.password = "Password field is required.";
      }

      if(!username)
      {
        newErrors.username = "Username field is required.";
      }

          return newErrors;

    }

    const handleLogin = () => {

         const validationErrors = validateForm();
        setErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) return;

        const data = {
            username,
            password,
        };

        axios.post('http://localhost:3002/admin/login', data)
            .then((response) => {
                navigate('/employees/');
                sessionStorage.setItem('token', response.data.token);
            })
            .catch((error) => {

              if(error.response.data === "User not found")
              {
                enqueueSnackbar('Incorrect username.', { variant: 'error' });
              }
              else if(error.response.data === "Invalid password")
              {
                enqueueSnackbar("Incorrect password.", {variant: "error"});
              }

                console.error(error);
            });
    };

  
    
  return (
    <div>
      <div className="flex h-screen w-100">
        <div className="flex-2 side-login-panel bg-blue-500 p-8 text-white w-50 hidden sm:block"></div>
        <div className="flex-1 bg-white my-auto p-8 text-white">
          <header>
            <nav className="bg-white w-full  border-gray-200 text-gray-900 w-100 mb-8 py-4">
              <div className="flex flex-wrap justify-between items-left mx-auto max-w-full">
                <Link to="/" className="flex items-center">
                  <img
                    src={icon}
                    className="mr-3 h-10 sm:h-9"
                    alt="Flowbite Logo"
                  />
                  <span className="self-center text-2xl object-cover font-semibold whitespace-nowrap text-blue-700">
                    Manageme
                  </span>
                </Link>
                <div className="flex items-center lg:order-2">
                  <Link
                    to="/"
                    className="text-gray-800 hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-md px-4 lg:px-5 py-2 lg:py-2.5 mr-2"
                  >
                    Back
                  </Link>
                </div>
              </div>
            </nav>
          </header>

          <div className="login-section ">
            <h1 className="text-3xl text-blue-700 font-bold mt-12 lg:text-4xl">
              Login
            </h1>
            <p className="font-normal text-gray-500 mt-4 lg:text-xl">
              Welcome back! Please provide your details below...
            </p>
            <div className="mb-6 mt-8">
              <p
                htmlFor="default-input"
                className="block mb-2 mt-6 text-md   font-medium text-gray-900"
              >
                Username
              </p>
              <input
                type="text"
                name="username"
                id="username"
                placeholder="Enter your username..."
                value={username}
                onChange={(e) => {
                    setUsername(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.username;
                      return newErrors;
                    });
                  }}
                className="   bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg   block w-full   p-3"
              />
                {errors.username && (
                      <label className="text-sm text-red-500">
                        {errors.username}
                      </label>
                    )}            
            </div>
            <div className="mb-2">
              <p
                htmlFor="default-input"
                className="block mb-2 text-md  font-medium text-gray-900"
              >
                Password
              </p>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                id="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }}
                placeholder="Enter your password..."
                className="  bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full  p-3"
              />
                     {errors.password && (
                      <label className="text-sm text-red-500">
                        {errors.password}
                      </label>
                    )}            
            </div>
            <div className="flex items-center mt-4 justify-between">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showPassword"
                    aria-describedby="remember"
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}

                    className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="showPassword"
                    className="text-gray-500 text-sm"
                  >
                    Show Password
                  </label>
                </div>
              </div>
            </div>
            <button
              id="login-button"
              onClick = {handleLogin}
              className="text-white mt-6  bg-blue-600 hover:bg-blue-700 p-2.5 button-primary  focus:ring-4  font-medium rounded-lg text-sm sm:px-4 lg:px-4 focus:outline-none"
            >
              Login
            </button>
            <p className="text-gray-900 mt-4 font-normal">
              Don't have an account?{" "}
              <Link to="/register" className="font-semibold">
                Sign Up!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
