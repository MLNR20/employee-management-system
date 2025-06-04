import './index.css'; // or './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Home from './pages/index';
import ViewEmployees from "./pages/crud/view_employees";
import AddEmployees from "./pages/crud/add_employees";
import EditEmployees from "./pages/crud/edit_employees";
import ProtectedRoute from './components/protectedroute';


function App() {
  return (
    <div className="App">
       <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/employees" element={<ProtectedRoute><ViewEmployees /></ProtectedRoute>} />
          <Route path="/employees/add" element={<ProtectedRoute><AddEmployees /></ProtectedRoute>} />
          <Route path="/employees/edit/:id" element={<ProtectedRoute><EditEmployees /></ProtectedRoute>} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
