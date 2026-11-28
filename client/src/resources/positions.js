import {
  useDepartments,
  usePositions,
  usePositionsPage,
  usePosition,
  useCreatePosition,
  useUpdatePosition,
  useRemovePosition,
} from "../hooks/useEntities";
import { statusColumn, nameOf, lookups } from "./shared";

// The job titles each department offers: what the employee form lists after a department is chosen.
export const positionResource = {
  key: "positions",
  title: "Positions",
  singular: "Position",
  basePath: "/positions",
  // Positions are organization settings: they share the Departments permissions.
  access: {
    view: "departments:view",
    create: "departments:create",
    edit: "departments:edit",
    remove: "departments:delete",
  },
  deleteNote: "Employees who hold this position keep it; it is no longer offered to others.",
  hooks: {
    useList: usePositions,
    usePage: usePositionsPage,
    useOne: usePosition,
    useCreate: useCreatePosition,
    useUpdate: useUpdatePosition,
    useRemove: useRemovePosition,
  },
  useExtras: () => lookups({ departments: useDepartments() }),
  columns: ({ departments }) => [
    { key: "name", header: "Position", sortKey: "name" },
    { key: "department", header: "Department", accessor: (p) => nameOf(departments, p.departmentId, (d) => d.name) },
    statusColumn(),
  ],
  fields: [
    { name: "name", label: "Position", type: "text", required: true },
    {
      name: "departmentId",
      label: "Department",
      type: "select",
      required: true,
      optionsFrom: { useList: useDepartments, value: (d) => d.id, label: (d) => d.name },
    },
    { name: "isActive", label: "Active (offered in the employee form)", type: "checkbox", default: true },
  ],
};
