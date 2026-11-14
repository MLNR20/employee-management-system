import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSnackbar } from "notistack";
import PageLayout from "../../components/PageLayout";
import { useRoles, useUpdateRole, usePermissionCatalog } from "../../hooks/useEntities";
import { permissionKey } from "../../domain/role/Role";
import {
  allKeys,
  catalogActions,
  hasAll,
  hasSome,
  isDirty,
  moduleKeys,
  setMany,
  toggle,
} from "../../domain/role/permissionRules";

const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** A checkbox that shows a dash when only some of its group is granted. */
function GroupCheckbox({ checked, indeterminate, onChange, label }) {
  return (
    <input
      type="checkbox"
      aria-label={label}
      checked={checked}
      ref={(element) => {
        if (element) element.indeterminate = indeterminate && !checked;
      }}
      onChange={onChange}
      className="w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-300"
    />
  );
}

export default function RolePermissions() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: roles = [], isLoading: loadingRoles } = useRoles();
  const { data: catalog = [], isLoading: loadingCatalog } = usePermissionCatalog();
  const update = useUpdateRole();

  const [selectedId, setSelectedId] = useState(null);
  const [draft, setDraft] = useState(() => new Set());

  // Open the first role once the list arrives; fall back to it if the open one is deleted.
  useEffect(() => {
    if (roles.length && !roles.some((role) => role.id === selectedId)) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  const role = roles.find((r) => r.id === selectedId);

  // Refill the draft when another role opens or its saved permissions change. Keyed on a string,
  // not on `role`: a background refetch returns new objects and must not wipe unsaved edits.
  const savedKey = role ? [...role.permissions].sort().join("|") : "";
  useEffect(() => {
    setDraft(new Set(savedKey ? savedKey.split("|") : []));
  }, [selectedId, savedKey]);

  const actions = useMemo(() => catalogActions(catalog), [catalog]);
  const dirty = role ? isDirty(draft, role.permissions) : false;
  const every = allKeys(catalog);

  const save = () => {
    update.mutate(
      {
        id: role.id,
        // The update route validates the whole role, so send its name along with the permissions.
        data: {
          name: role.name,
          description: role.description,
          isActive: role.isActive,
          permissions: [...draft],
        },
      },
      {
        onSuccess: () => enqueueSnackbar(`Permissions saved for ${role.name}`, { variant: "success" }),
        onError: (error) =>
          enqueueSnackbar(error.response?.data?.message ?? "Could not save permissions", { variant: "error" }),
      }
    );
  };

  const confirmDiscard = () => !dirty || window.confirm("Discard your unsaved permission changes?");

  const openRole = (id) => {
    if (id !== selectedId && confirmDiscard()) setSelectedId(id);
  };

  let body;
  if (loadingRoles || loadingCatalog) {
    body = <p className="text-gray-500">Loading...</p>;
  } else if (!roles.length) {
    body = (
      <p className="text-gray-500">
        There are no roles yet.{" "}
        <Link to="/roles/add" className="text-blue-700 hover:underline">
          Add a role
        </Link>{" "}
        to start granting permissions.
      </p>
    );
  } else {
    body = (
      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Roles" className="lg:w-64 shrink-0">
          <ul className="space-y-1">
            {roles.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => openRole(r.id)}
                  aria-current={r.id === selectedId ? "true" : undefined}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                    r.id === selectedId ? "bg-gray-100 text-gray-900" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <span className="block">{r.name}</span>
                  <span className="block text-xs font-normal text-gray-400">
                    {r.permissions.length} of {every.length} permissions
                    {r.isActive === false ? " · Inactive" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {role && (
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold">{role.name}</h2>
                {role.description && <p className="text-sm text-gray-500">{role.description}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(setMany(draft, every, !hasAll(draft, every)))}
                  className="text-gray-800 border border-gray-300 hover:bg-gray-50 font-medium rounded-lg text-sm px-4 py-2"
                >
                  {hasAll(draft, every) ? "Clear all" : "Select all"}
                </button>
                <button
                  type="button"
                  disabled={!dirty}
                  onClick={() => setDraft(new Set(role.permissions))}
                  className="text-gray-800 border border-gray-300 hover:bg-gray-50 font-medium rounded-lg text-sm px-4 py-2 disabled:opacity-50"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!dirty || update.isPending}
                  onClick={save}
                  className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2 disabled:opacity-50"
                >
                  {update.isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                  <tr>
                    <th scope="col" className="px-4 py-3">Module</th>
                    {actions.map((action) => {
                      const column = catalog
                        .filter((module) => module.actions.includes(action))
                        .map((module) => permissionKey(module.key, action));
                      return (
                        <th key={action} scope="col" className="px-3 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span>{action}</span>
                            <GroupCheckbox
                              label={`Grant ${action} on every module`}
                              checked={hasAll(draft, column)}
                              indeterminate={hasSome(draft, column)}
                              onChange={() => setDraft(setMany(draft, column, !hasAll(draft, column)))}
                            />
                          </div>
                        </th>
                      );
                    })}
                    <th scope="col" className="px-3 py-3 text-center">All</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((module) => {
                    const keys = moduleKeys(module);
                    return (
                      <tr key={module.key} className="border-t border-gray-100 hover:bg-gray-50">
                        <th scope="row" className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {module.label}
                        </th>
                        {actions.map((action) =>
                          module.actions.includes(action) ? (
                            <td key={action} className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                aria-label={`${titleCase(action)} ${module.label}`}
                                checked={draft.has(permissionKey(module.key, action))}
                                onChange={() => setDraft(toggle(draft, permissionKey(module.key, action)))}
                                className="w-4 h-4 rounded border-gray-300 text-blue-700 focus:ring-blue-300"
                              />
                            </td>
                          ) : (
                            <td key={action} className="px-3 py-3 text-center text-gray-300" aria-hidden="true">
                              &ndash;
                            </td>
                          )
                        )}
                        <td className="px-3 py-3 text-center">
                          <GroupCheckbox
                            label={`Grant everything on ${module.label}`}
                            checked={hasAll(draft, keys)}
                            indeterminate={hasSome(draft, keys)}
                            onChange={() => setDraft(setMany(draft, keys, !hasAll(draft, keys)))}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {dirty && <p className="mt-3 text-sm text-amber-600">You have unsaved changes.</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <PageLayout
      title="Roles & Permissions"
      actions={
        <Link to="/roles/add" className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5">
          Add Role
        </Link>
      }
    >
      {body}
    </PageLayout>
  );
}
