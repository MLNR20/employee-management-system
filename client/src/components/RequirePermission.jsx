import { Navigate } from "react-router-dom";
import { useCan } from "../hooks/useEntities";

/**
 * Shows its children only to an administrator who holds `permission`; everyone else is sent to the
 * dashboard. This is a courtesy so people are not shown pages that would only fail: the server
 * refuses the requests itself, so removing this guard would not expose any data.
 */
export default function RequirePermission({ permission, children }) {
  const { allowed, isLoading } = useCan(permission);

  if (isLoading) return null;
  if (!allowed) return <Navigate to="/dashboard" replace />;
  return children;
}
