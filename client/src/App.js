import './index.css'; // or './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/auth/login';
import Register from './pages/auth/register';
import Home from './pages/index';
import ViewEmployees from "./pages/crud/view_employees";
import AddEmployees from "./pages/crud/add_employees";
import EditEmployees from "./pages/crud/edit_employees";
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
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/employees" element={<ProtectedRoute><ViewEmployees /></ProtectedRoute>} />
            <Route path="/employees/add" element={<ProtectedRoute><AddEmployees /></ProtectedRoute>} />
            <Route path="/employees/edit/:id" element={<ProtectedRoute><EditEmployees /></ProtectedRoute>} />

            {resources.flatMap((resource) => [
              <Route
                key={`${resource.key}-list`}
                path={resource.basePath}
                element={guard(`${resource.key}-list`, <ResourceListPage resource={resource} />)}
              />,
              <Route
                key={`${resource.key}-add`}
                path={`${resource.basePath}/add`}
                element={guard(`${resource.key}-add`, <ResourceFormPage resource={resource} />)}
              />,
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
