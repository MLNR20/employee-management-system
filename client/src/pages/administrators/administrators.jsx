import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import PageLayout from "../../components/PageLayout";
import FormBuilder from "../../components/form/FormBuilder";
import { useAdministrators } from "../../hooks/useEntities";
import { useAuth } from "../../context/AuthContext";
import { accountUseCases } from "../../container";
import { PASSWORD_MAX, PASSWORD_MIN, passwordError } from "../../domain/auth/passwordRules";

const fields = [
  { name: "first_name", label: "First name", type: "text", required: true },
  { name: "last_name", label: "Last name", type: "text", required: true },
  { name: "username", label: "Username", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "password",
    label: "Temporary password",
    type: "password",
    required: true,
    hint: `${PASSWORD_MIN} to ${PASSWORD_MAX} characters. Ask them to change it after signing in.`,
    validate: passwordError,
  },
];

const showError = (title) => (error) =>
  Swal.fire(title, error.response?.data?.message ?? "Something went wrong.", "error");

/** Administrator accounts: add one, or set a new password for someone who forgot theirs. */
export default function Administrators() {
  const { data: administrators = [], isLoading, error } = useAdministrators();
  const { administrator: me } = useAuth();
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  const add = async (account) => {
    setSaving(true);
    try {
      await accountUseCases.register(account);
      await queryClient.invalidateQueries({ queryKey: ["administrators"] });
      setAdding(false);
      Swal.fire("Administrator added", "Give them a role under Role Assignments so they can use the system.", "success");
    } catch (failure) {
      showError("Could not add the administrator")(failure);
    } finally {
      setSaving(false);
    }
  };

  const reset = async (account) => {
    const { isConfirmed, value } = await Swal.fire({
      title: `New password for ${account.fullName}`,
      input: "password",
      inputLabel: "Give it to them privately. Their open sessions end.",
      inputValidator: passwordError,
      showCancelButton: true,
      confirmButtonText: "Reset password",
    });
    if (!isConfirmed) return;
    accountUseCases
      .resetPassword(account.id, value)
      .then(() => Swal.fire("Password reset", "", "success"))
      .catch(showError("Could not reset the password"));
  };

  return (
    <PageLayout
      title="Administrators"
      actions={
        !adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-5 py-2.5"
          >
            Add Administrator
          </button>
        )
      }
    >
      {adding && (
        <section className="mb-6">
          <FormBuilder fields={fields} onSubmit={add} isSubmitting={saving} onCancel={() => setAdding(false)} />
        </section>
      )}

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error.response?.data?.message ?? "Could not load the administrators."}</p>}

      {administrators.length > 0 && (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {administrators.map((account) => (
                <tr key={account.id} className="border-t border-gray-100">
                  <th scope="row" className="px-4 py-3 font-medium text-gray-900">{account.fullName}</th>
                  <td className="px-4 py-3">{account.username}</td>
                  <td className="px-4 py-3">{account.email}</td>
                  <td className="px-4 py-3">
                    {account.id === me?.id ? (
                      <Link to="/profile" className="text-blue-700 font-medium hover:underline">
                        Change my password
                      </Link>
                    ) : (
                      <button type="button" className="text-blue-700 font-medium hover:underline" onClick={() => reset(account)}>
                        Reset password
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageLayout>
  );
}
