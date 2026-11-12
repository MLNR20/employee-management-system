import {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  useRemoveRole,
  useRoleAssignments,
  useRoleAssignment,
  useCreateRoleAssignment,
  useRemoveRoleAssignment,
  useAdministrators,
} from "../hooks/useEntities";
import { statusColumn, dateColumn, nameOf } from "./shared";

export const roleResource = {
  key: "roles",
  title: "Roles",
  singular: "Role",
  basePath: "/roles",
  hooks: {
    useList: useRoles,
    useOne: useRole,
    useCreate: useCreateRole,
    useUpdate: useUpdateRole,
    useRemove: useRemoveRole,
  },
  columns: () => [
    { key: "name", header: "Name" },
    { key: "description", header: "Description" },
    statusColumn(),
    dateColumn("dateCreated", "Created"),
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};

// Assignments are created and removed, never edited: no useUpdate, so no Edit button or route.
export const roleAssignmentResource = {
  key: "role-assignments",
  title: "Role Assignments",
  singular: "Role Assignment",
  basePath: "/role-assignments",
  hooks: {
    useList: useRoleAssignments,
    useOne: useRoleAssignment,
    useCreate: useCreateRoleAssignment,
    useRemove: useRemoveRoleAssignment,
  },
  useExtras: () => ({
    administrators: useAdministrators().data,
    roles: useRoles().data,
  }),
  columns: ({ administrators, roles }) => [
    {
      key: "administrator",
      header: "Administrator",
      accessor: (a) => nameOf(administrators, a.administratorId, (x) => x.fullName),
    },
    {
      key: "role",
      header: "Role",
      accessor: (a) => nameOf(roles, a.roleId, (r) => r.name),
    },
    dateColumn("dateCreated", "Assigned"),
  ],
  fields: [
    {
      name: "administratorId",
      label: "Administrator",
      type: "select",
      required: true,
      optionsFrom: { useList: useAdministrators, value: (a) => a.id, label: (a) => `${a.fullName} (${a.username})` },
    },
    {
      name: "roleId",
      label: "Role",
      type: "select",
      required: true,
      optionsFrom: { useList: useRoles, value: (r) => r.id, label: (r) => r.name },
    },
  ],
};
