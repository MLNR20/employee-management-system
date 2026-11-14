import './index.css'; // or './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot_password';
import EmployeeLogin from './pages/employee/login';
import EmployeePortal from './pages/employee/portal';
import EmployeeLeave from './pages/employee/leave';
import EmployeeEquipment from './pages/employee/equipment';
import Dashboard from './pages/dashboard';
import ViewEmployees from "./pages/crud/view_employees";
import AddEmployees from "./pages/crud/add_employees";
import EditEmployees from "./pages/crud/edit_employees";
import RolePermissions from './pages/roles/permissions';
import DocumentChecklist from './pages/documents/checklist';
import ProtectedRoute from './components/protectedroute';
import ResourceListPage from './components/resource/ResourceListPage';
import ResourceFormPage from './components/resource/ResourceFormPage';
import { AuthProvider } from './context/AuthContext';
import { resources } from './resources';

// Every route needs a distinct key: the list and form pages call different hooks per
// resource, so React must remount them (not reuse one instance) when the route changes.
const guard = (key, page) => <ProtectedRoute key={key}>{page}</ProtectedRoute>;

function App() {
  return (
    <div className="App">
       <Router>
        <AuthProvider>
          <Routes>
            {/* No landing page: signed-in users go to the dashboard, everyone else to login. */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/employee" element={<EmployeePortal />} />
            <Route path="/employee/leave" element={<EmployeeLeave />} />
            <Route path="/employee/equipment" element={<EmployeeEquipment />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute><RolePermissions /></ProtectedRoute>} />
            <Route path="/documents/checklist" element={<ProtectedRoute><DocumentChecklist /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><ViewEmployees /></ProtectedRoute>} />
            <Route path="/employees/add" element={<ProtectedRoute><AddEmployees /></ProtectedRoute>} />
            <Route path="/employees/edit/:id" element={<ProtectedRoute><EditEmployees /></ProtectedRoute>} />

            {resources.flatMap((resource) => [
              <Route
                key={`${resource.key}-list`}
                path={resource.basePath}
                element={guard(`${resource.key}-list`, <ResourceListPage resource={resource} />)}
              />,
              // Read-only resources (no useCreate hook) get no add route either.
              ...(resource.hooks.useCreate
                ? [
                    <Route
                      key={`${resource.key}-add`}
                      path={`${resource.basePath}/add`}
                      element={guard(`${resource.key}-add`, <ResourceFormPage resource={resource} />)}
                    />,
                  ]
                : []),
              // Resources that cannot be edited (no useUpdate hook) get no edit route.
              ...(resource.hooks.useUpdate
                ? [
                    <Route
                      key={`${resource.key}-edit`}
                      path={`${resource.basePath}/edit/:id`}
                      element={guard(`${resource.key}-edit`, <ResourceFormPage resource={resource} />)}
                    />,
                  ]
                : []),
            ])}
          </Routes>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
