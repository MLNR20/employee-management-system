import { Link } from "react-router-dom";
import Swal from "sweetalert2";
import PageLayout from "../PageLayout";
import DataTable from "../datatable/DataTable";

const noExtras = () => ({});
const noHook = () => null;

/**
 * List page for any resource config (see src/resources): a DataTable with an
 * Add button, plus Edit and Delete per row when the resource supports them
 * (it has a useUpdate / useRemove hook). A resource can add its own row buttons
 * with rowActions(row), e.g. Approve/Reject for leave requests.
 */
export default function ResourceListPage({ resource }) {
  const { title, singular, basePath, hooks } = resource;
  const { data = [], isLoading, error } = hooks.useList();
  const remove = (hooks.useRemove ?? noHook)();
  const extras = (resource.useExtras ?? noExtras)(); // e.g. lookup lists for readable columns
  const canEdit = Boolean(hooks.useUpdate);
  const canDelete = Boolean(hooks.useRemove);

  const confirmDelete = (id) =>
    Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Delete",
    }).then((result) => {
      if (!result.isConfirmed) return;
      remove.mutate(id, {
        onSuccess: () => Swal.fire(`${singular} deleted!`, `The ${singular.toLowerCase()} has been removed.`, "success"),
        onError: (err) =>
          Swal.fire("Could not delete", err.response?.data?.message ?? "Something went wrong.", "error"),
      });
    });

  const hasOperations = canEdit || canDelete || Boolean(resource.rowActions);

  const columns = [
    { key: "index", header: "#", sortable: false, searchable: false, render: (_, index) => index + 1 },
    ...resource.columns(extras),
    ...(hasOperations
      ? [
          {
            key: "operations",
            header: "Operations",
            render: (row) => (
              <div className="flex flex-row gap-2">
                {resource.rowActions?.(row, extras)}
                {canDelete && (
                  <button
                    className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5"
                    onClick={() => confirmDelete(row.id)}
                  >
                    Delete
                  </button>
                )}
                {canEdit && (
                  <Link
                    to={`${basePath}/edit/${row.id}`}
                    className="focus:outline-none text-white bg-purple-700 hover:bg-purple-800 focus:ring-4 focus:ring-purple-300 font-medium rounded-lg text-sm px-5 py-2.5"
                  >
                    Edit
                  </Link>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <PageLayout
      title={title}
      actions={
        <Link
          to={`${basePath}/add`}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5"
        >
          {resource.addLabel ?? `Add ${singular}`}
        </Link>
      }
    >
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        error={error}
        emptyMessage="No records found."
      />
    </PageLayout>
  );
}
