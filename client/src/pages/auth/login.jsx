import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { authUseCases } from '../../container';
import { useAuth } from '../../context/AuthContext';
import { InvalidCredentialsError } from '../../domain/errors';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { initFlowbite } from "flowbite";
import PasswordInput from "../../components/PasswordInput";
import AuthLayout from "../../components/AuthLayout";


function Login() {
  

    const [username, setUsername]  = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const { enqueueSnackbar } = useSnackbar();
    const { login } = useAuth();



    useEffect(() => {
            authUseCases.ensureAdministratorsExist()
              .then(() => {
                document.body.classList.remove("overflow-hidden");
                document.querySelector('[drawer-backdrop]')?.remove();
              })
              .catch(err => {
                console.error(err);
              });
          }, []);

        useEffect(() => {
          initFlowbite(); 
        }, []);
          

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

        login({ username, password })
            .then(() => {
                navigate('/dashboard');
            })
            .catch((error) => {

              if(error instanceof InvalidCredentialsError)
              {
                enqueueSnackbar(error.message, { variant: 'error' });
              }

                console.error(error);
            });
    };

  
    
  return (
    <AuthLayout>
            <h1 className="text-3xl text-black font-bold mt-12 lg:text-4xl">
              Login
            </h1>
            <p className="font-normal text-gray-500 mt-4 lg:text-xl">
              Welcome back! Please provide your details below...
            </p>
            <div className="mb-6 mt-8">
              <p
                htmlFor="default-input"
                className="block mb-2 mt-6 text-base font-medium text-gray-900"
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
                className="bg-gray-50 border border-red-600 text-gray-900 text-base rounded-lg focus:ring-red-600 focus:border-red-600 block w-full p-3"
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
                className="block mb-2 text-base font-medium text-gray-900"
              >
                Password
              </p>
              <PasswordInput
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
                className="bg-gray-50 border border-red-600 text-gray-900 text-base rounded-lg focus:ring-red-600 focus:border-red-600 block w-full p-3"
              />
                     {errors.password && (
                      <label className="text-sm text-red-500">
                        {errors.password}
                      </label>
                    )}            
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-base font-medium text-red-700 hover:underline">
                Forgot password?
              </Link>
            </div>
            <button
              id="login-button"
              onClick = {handleLogin}
              className="text-white mt-6 bg-red-700 hover:bg-red-800 px-5 py-3 button-primary focus:ring-4 font-medium rounded-lg text-base focus:outline-none"
            >
              Login
            </button>
            <p className="text-gray-900 mt-6 text-base">
              Not an administrator?{" "}
              <Link to="/employee/login" className="font-semibold text-red-700 hover:underline">
                Login as employee
              </Link>
            </p>
    </AuthLayout>
  );
}

export default Login;
