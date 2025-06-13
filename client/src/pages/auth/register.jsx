import {  useState, useEffect } from "react";
import icon from "../assets/icon.png";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Swal from "sweetalert2";
import { useSnackbar } from "notistack";
const Register = () => {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const {enqueueSnackbar} = useSnackbar();






  useEffect(()=>{
        axios.get('http://localhost:8080/admin/')
          .then(response => {
            console.log(response.data);
          })
          .catch(err => {
    
            if(err.message === "Request failed with status code 403") navigate("/login/")
            console.error(err);
          });
    
      });
  

  const validateForm = () => {
    const newErrors = {};
    const regex = /^[A-Za-z-]+$/;
    const regexPassword = /^(?=.*[A-Za-z0-9])(?=.*[^A-Za-z0-9]).+$/;

   if (!first_name)
    {
      newErrors.first_name = "First name is required." ;
    } 
    else if(first_name.length <2)
    {
      newErrors.first_name = "First name must be not be a single character";
    }
    else if(!regex.test(first_name))
    {
      newErrors.first_name = "First name must contain letters and - only."
    }

    if (!last_name)
    {
      newErrors.last_name = "Last name is required.";
    } 
    else if(last_name.length < 2)
    {
       newErrors.last_name = "Last name must not be a single character";
    }
    else if(!regex.test(last_name))
    {
      newErrors.last_name = "Last name must contain letters and - only."
    }


    if (!email) {
      newErrors.email = "Email is required.";
    } 
    else if(email.length < 3)
    {
      newErrors.email = "Email must not be limited to two characters."
    }
    else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        newErrors.email = "Enter a valid email address.";
      }
    }

    if (!username) {
      newErrors.username = "Username is required.";
    }
    else if(username.length < 3)
    {
      newErrors.username = "Username must be not be limited to two characters."
    }

    if (!password) {
      newErrors.password = "Password is required.";
    }
    else if(password.length<8)
    {      
      newErrors.password = "Password must be eight characters."
    }
    else if(!regexPassword.test(password))
    {
      newErrors.password = "Password must have a special character and number." 
    }


    if(!confirmPassword)
    {
      newErrors.confirmPassword = "Confirm password is required."
    }
    else if(confirmPassword !== password && regexPassword.test(password))
    {
        newErrors.setConfirmPassword=""
        Swal.fire({
            title: "Password Mismatch!",
            text: "Confirm password and password are mismatched.",
            icon: "warning",
            confirmButtonColor: "#3F7D58",
            confirmButtonText: "OK",
          })
    }

    return newErrors;
  };

  const registerHandle = () => {
   const validationErrors = validateForm();
   setErrors(validationErrors);
   if (Object.keys(validationErrors).length > 0) return;

    const admin = {
      first_name,
      last_name,
      email,
      password,
      username,
    };

    axios.post("http://localhost:8080/admin/register", admin).then(() => {
      navigate("/login/");
    }).catch(err => {
      console.error("Registration failed", err);

      if(err.response.data.code === 11000)
      {
        enqueueSnackbar('Username or email address taken.', { variant: 'error' });
      }
      
    });
  };

  return (
  <div>
      <div className="flex h-screen w-100">
        <div className="flex-2 side-login-panel bg-blue-500 p-8 text-white w-50 hidden sm:block"></div>
        <div className="flex-1 bg-white my-auto p-8 text-white">
          <header>
            <nav className="bg-white w-full  border-gray-200 text-gray-900 w-100  mb-8 py-4 ">
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
              Register
            </h1>
            <p className="font-normal text-gray-500 mt-4 lg:text-xl">
              Welcome, glad that you're working with us!
            </p>
            <div className="grid mt-8 gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="first_name"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="user_name"
                  name="last_name"
                  value={first_name}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.first_name;
                      return newErrors;
                    });
                  }}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Enter your username..."
                  required
                />
               {errors.first_name && (
                      <label className="text-sm text-red-500">
                        {errors.first_name}
                      </label>
                    )}

              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  name="last_name"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Enter your last name..."
                  value={last_name}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.last_name;
                      return newErrors;
                    });
                  }}
                  required
                />
                  {errors.last_name && (
                      <label className="text-sm text-red-500">
                        {errors.last_name}
                      </label>
                    )}            
              </div>
              <div>
                <label
                  htmlFor="username"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="user_name"
                  name="username"
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
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
                  required
                />
                {errors.username && (
                      <label className="text-sm text-red-500">
                        {errors.username}
                      </label>
                    )}            
              </div>
              <div>
                <label
                  htmlFor="website"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email_address"
                  name="emailaddress"
                  className="   bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.email;
                      return newErrors;
                    });
                  }}
                  required
                />
                {errors.email && (
                      <label className="text-sm text-red-500">
                        {errors.email}
                      </label>
                    )}            
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  className="  bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.password;
                      return newErrors;
                    });
                  }}
                  required
                />
                   {errors.password && (
                      <label className="text-sm text-red-500">
                        {errors.password}
                      </label>
                    )}            
                  </div>
              <div>
                <label
                  htmlFor="password"
                  className="block mb-2 text-sm font-medium text-gray-900"
                >
                  Confirm Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirm_password"
                  className="  bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-3"
                  placeholder="Enter your password..."
                   value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((prevErrors) => {
                      const newErrors = { ...prevErrors };
                      delete newErrors.confirmPassword;
                      return newErrors;
                    });
                  }}
                  required
                />
                  {errors.confirmPassword && (
                      <label className="text-sm text-red-500">
                        {errors.confirmPassword}
                      </label>
                    )}            
              </div>
            </div>

            <div className="flex items-center mt-4 justify-between">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="showPassword"
                    aria-describedby="remember"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    type="checkbox"
                    className="w-4 h-4 border border-gray-300 rounded bg-gray-50 focus:ring-3 focus:ring-primary-300"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="showPassword" className="text-gray-500 text-sm">
                    Show Password
                  </label>
                </div>
              </div>
            </div>
            <button
              id="htmlForgot-button"
              onClick={registerHandle}
              className="text-white mt-6 bg-blue-600 p-2.5 hover:bg-blue-700 login-button button-primary  focus:ring-4  font-medium rounded-lg text-sm sm:px-4 lg:px-4 focus:outline-none"
            >
              Sign Up
            </button>
            <p className="text-gray-900 mt-4 font-normal">
              Have an account?{" "}
              <Link to="/login" className="font-semibold">
                Log In!
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;



