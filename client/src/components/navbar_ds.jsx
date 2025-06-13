import { Link, useNavigate } from 'react-router-dom';
import icon from './assets/icon.png';
import { useEffect, useState } from 'react';
import axios from "axios";

const Navbars=() =>{


    const [first_name, setFirstName] = useState("");
    const [last_name, setLastName] =useState("");
    const token = sessionStorage.getItem('token'); // Get token from storage
    const navigate = useNavigate();


    useEffect(()=>{
    axios.get('http://localhost:8080/employees/protected', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(response => {
        setFirstName(response.data.user.first_name);
        setLastName(response.data.user.last_name);     
      })
      .catch(err => {
        if(err.message === "Request failed with status code 403") navigate("/login/")
      });

  });

  return (

    <nav className="bg-white border-b border-gray-200 px-4 py-4  fixed left-0 right-0 top-0 z-50">
      <div className="flex flex-wrap justify-between items-center">
        <div className="flex justify-start items-center">
            <button data-drawer-target="default-sidebar" data-drawer-toggle="default-sidebar" aria-controls="default-sidebar" type="button" className="inline-flex items-center p-2 mt-2 ml-3 text-sm text-gray-500 rounded-lg sm:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600"><span className="sr-only">Open sidebar</span><svg className="w-6 h-6" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path clipRule="evenodd" fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z"></path></svg></button>
        
          <Link to="/" className="flex items-center justify-between mr-4">
            <img src={icon} className="mr-3 ml-3 h-10" alt="ManageMe Icon"/>
            <span className="self-center text-2xl font-semibold whitespace-nowrap hidden  sm:hidden lg:block">ManageMe</span>
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