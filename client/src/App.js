import './index.css'; // or './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot_password';
import EmployeeLogin from './pages/employee/login';
import EmployeePortal from './pages/employee/portal';
import EmployeeProfile from './pages/employee/profile';
import EmployeeAttendance from './pages/employee/attendance';
import EmployeeLeave from './pages/employee/leave';
import EmployeeEquipment from './pages/employee/equipment';
import Dashboard from './pages/dashboard';
import ViewEmployees from "./pages/crud/view_employees";
import AddEmployees from "./pages/crud/add_employees";
import EditEmployees from "./pages/crud/edit_employees";
import RolePermissions from './pages/roles/permissions';
import DocumentChecklist from './pages/documents/checklist';
import Payroll from './pages/payroll/payroll';
import ProtectedRoute from './components/protectedroute';
import RequirePermission from './components/RequirePermission';
import ResourceListPage from './components/resource/ResourceListPage';
import ResourceFormPage from './components/resource/ResourceFormPage';
import EmployeeProtectedRoute from './components/employee/EmployeeProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { EmployeeAuthProvider } from './context/EmployeeAuthContext';
import { resources } from './resources';

// Every route needs a distinct key: the list and form pages call different hooks per
// resource, so React must remount them (not reuse one instance) when the route changes.
// A resource with a `permission` (HR salary rates) is also hidden from administrators without it.
const guard = (key, page, permission) => (
  <ProtectedRoute key={key}>
    {permission ? <RequirePermission permission={permission}>{page}</RequirePermission> : page}
  </ProtectedRoute>
);

function App() {
  return (
    <div className="App">
       <Router>
        <AuthProvider>
         <EmployeeAuthProvider>
          <Routes>
            {/* No landing page: signed-in users go to the dashboard, everyone else to login. */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/employee" element={<EmployeeProtectedRoute><EmployeePortal /></EmployeeProtectedRoute>} />
            <Route path="/employee/profile" element={<EmployeeProtectedRoute><EmployeeProfile /></EmployeeProtectedRoute>} />
            <Route path="/employee/attendance" element={<EmployeeProtectedRoute><EmployeeAttendance /></EmployeeProtectedRoute>} />
            <Route path="/employee/leave" element={<EmployeeProtectedRoute><EmployeeLeave /></EmployeeProtectedRoute>} />
            <Route path="/employee/equipment" element={<EmployeeProtectedRoute><EmployeeEquipment /></EmployeeProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute><RolePermissions /></ProtectedRoute>} />
            <Route path="/documents/checklist" element={<ProtectedRoute><DocumentChecklist /></ProtectedRoute>} />
            <Route path="/payroll" element={guard("payroll", <Payroll />, "salary-rates:view")} />
            <Route path="/employees" element={<ProtectedRoute><ViewEmployees /></ProtectedRoute>} />
            <Route path="/employees/add" element={<ProtectedRoute><AddEmployees /></ProtectedRoute>} />
            <Route path="/employees/edit/:id" element={<ProtectedRoute><EditEmployees /></ProtectedRoute>} />

            {resources.flatMap((resource) => [
              <Route
                key={`${resource.key}-list`}
                path={resource.basePath}
                element={guard(`${resource.key}-list`, <ResourceListPage resource={resource} />, resource.permission)}
              />,
              // Read-only resources (no useCreate hook) get no add route either.
              ...(resource.hooks.useCreate
                ? [
                    <Route
                      key={`${resource.key}-add`}
                      path={`${resource.basePath}/add`}
                      element={guard(`${resource.key}-add`, <ResourceFormPage resource={resource} />, resource.permission)}
                    />,
                  ]
                : []),
              // Resources that cannot be edited (no useUpdate hook) get no edit route.
              ...(resource.hooks.useUpdate
                ? [
                    <Route
                      key={`${resource.key}-edit`}
                      path={`${resource.basePath}/edit/:id`}
                      element={guard(`${resource.key}-edit`, <ResourceFormPage resource={resource} />, resource.permission)}
                    />,
                  ]
                : []),
            ])}
          </Routes>
         </EmployeeAuthProvider>
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
