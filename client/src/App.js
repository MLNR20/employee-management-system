import './index.css'; // or './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/login';
import ForgotPassword from './pages/auth/forgot_password';
import EmployeeLogin from './pages/employee/login';
import EmployeePortal from './pages/employee/portal';
import EmployeeProfile from './pages/employee/profile';
import EmployeeAttendance from './pages/employee/attendance';
import EmployeeLeave from './pages/employee/leave';
import EmployeeLeaveRequests from './pages/employee/leave-requests';
import EmployeeEquipment from './pages/employee/equipment';
import Dashboard from './pages/dashboard';
import ViewEmployees from "./pages/crud/view_employees";
import AddEmployees from "./pages/crud/add_employees";
import EditEmployees from "./pages/crud/edit_employees";
import RolePermissions from './pages/roles/permissions';
import DocumentChecklist from './pages/documents/checklist';
import Payroll from './pages/payroll/payroll';
import Offboarding from './pages/offboarding/offboarding';
import Administrators from './pages/administrators/administrators';
import Account from './pages/account/account';
import { resourceAccess } from './domain/role/access';
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
// A page that needs a permission says "no access" to administrators without it.
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
            <Route path="/employee/leave/requests" element={<EmployeeProtectedRoute><EmployeeLeaveRequests /></EmployeeProtectedRoute>} />
            <Route path="/employee/equipment" element={<EmployeeProtectedRoute><EmployeeEquipment /></EmployeeProtectedRoute>} />
            <Route path="/dashboard" element={guard("dashboard", <Dashboard />, "dashboard:view")} />
            <Route path="/permissions" element={guard("permissions", <RolePermissions />, "roles:view")} />
            <Route path="/documents/checklist" element={guard("checklist", <DocumentChecklist />, "documents:view")} />
            <Route path="/offboarding" element={guard("offboarding", <Offboarding />, "employees:view")} />
            <Route path="/payroll" element={guard("payroll", <Payroll />, "salary-rates:view")} />
            <Route path="/employees" element={guard("employees", <ViewEmployees />, "employees:view")} />
            <Route path="/employees/add" element={guard("employees-add", <AddEmployees />, "employees:create")} />
            <Route path="/employees/edit/:id" element={guard("employees-edit", <EditEmployees />, "employees:edit")} />
            <Route path="/administrators" element={guard("administrators", <Administrators />, "role-assignments:create")} />
            <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />

            {resources.flatMap((resource) => [
              <Route
                key={`${resource.key}-list`}
                path={resource.basePath}
                element={guard(`${resource.key}-list`, <ResourceListPage resource={resource} />, resourceAccess(resource).view)}
              />,
              // Read-only resources (no useCreate hook) get no add route either.
              ...(resource.hooks.useCreate
                ? [
                    <Route
                      key={`${resource.key}-add`}
                      path={`${resource.basePath}/add`}
                      element={guard(`${resource.key}-add`, <ResourceFormPage resource={resource} />, resourceAccess(resource).create)}
                    />,
                  ]
                : []),
              // Resources that cannot be edited (no useUpdate hook) get no edit route.
              ...(resource.hooks.useUpdate
                ? [
                    <Route
                      key={`${resource.key}-edit`}
                      path={`${resource.basePath}/edit/:id`}
                      element={guard(`${resource.key}-edit`, <ResourceFormPage resource={resource} />, resourceAccess(resource).edit)}
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
