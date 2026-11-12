import { useNavigate, useParams } from "react-router-dom";
import Swal from "sweetalert2";
import PageLayout from "../PageLayout";
import FormBuilder from "../form/FormBuilder";

const noHook = () => null;

/**
 * Add/edit page for any resource config (see src/resources). The same page
 * serves both: with an :id in the route it loads and updates, otherwise it
 * creates. The form itself is a FormBuilder driven by resource.fields.
 */
export default function ResourceFormPage({ resource }) {
  const { singular, basePath, fields, hooks } = resource;
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const { data: entity } = hooks.useOne(id);
  const create = hooks.useCreate();
  const update = (hooks.useUpdate ?? noHook)();

  const save = (payload) => {
    const request = isEdit ? update.mutateAsync({ id, data: payload }) : create.mutateAsync(payload);

    return request
      .then(() =>
        Swal.fire({
          title: "Success!",
          text: `${singular} successfully ${isEdit ? "updated" : "added"}.`,
          icon: "success",
          confirmButtonColor: "#3F7D58",
        }).then(() => navigate(basePath))
      )
      .catch((error) => {
        // An expired session is already redirected to /login by the API client.
        Swal.fire("Could not save", error.response?.data?.message ?? "Something went wrong.", "error");
      });
  };

  return (
    <PageLayout title={`${isEdit ? "Edit" : "Add"} ${singular}`}>
      <FormBuilder
        fields={fields}
        initialValues={entity}
        onSubmit={save}
        isEditing={isEdit}
        isSubmitting={create.isPending || Boolean(update?.isPending)}
        onCancel={() => navigate(basePath)}
      />
    </PageLayout>
  );
}
