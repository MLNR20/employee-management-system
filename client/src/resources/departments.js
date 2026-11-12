import {
  useDepartments,
  useDepartmentsPage,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  useRemoveDepartment,
} from "../hooks/useEntities";
import { statusColumn, dateColumn } from "./shared";

export const departmentResource = {
  key: "departments",
  title: "Departments",
  singular: "Department",
  basePath: "/departments",
  hooks: {
    useList: useDepartments,
    usePage: useDepartmentsPage,
    useOne: useDepartment,
    useCreate: useCreateDepartment,
    useUpdate: useUpdateDepartment,
    useRemove: useRemoveDepartment,
  },
  columns: () => [
    { key: "name", header: "Name", sortKey: "name" },
    { key: "code", header: "Code", sortKey: "code" },
    { key: "description", header: "Description", sortKey: "description" },
    statusColumn(),
    dateColumn("dateCreated", "Created"),
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "code", label: "Code", type: "text", required: true },
    { name: "description", label: "Description", type: "textarea" },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};
