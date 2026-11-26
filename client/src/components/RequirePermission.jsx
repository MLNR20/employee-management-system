import PageLayout from "./PageLayout";
import { useAccess } from "../hooks/useEntities";

/**
 * Shows its children only to an administrator who holds `permission` (or one of a list); everyone else
 * is told they have no access. This is a courtesy so people are not shown pages that would only fail:
 * the server refuses the requests itself, so removing this guard would not expose any data.
 */
export default function RequirePermission({ permission, children }) {
  const { can, isLoading, isError } = useAccess();

  if (isLoading) return null;
  if (can(permission)) return children;

  return (
    <PageLayout title="No access">
      <p className="text-gray-500">
        {isError
          ? "Your permissions could not be checked. Reload the page to try again."
          : "Your roles do not give you access to this page. Ask an administrator who manages roles to assign you one. A new role takes effect when you sign in again, or within 15 minutes."}
      </p>
    </PageLayout>
  );
}
