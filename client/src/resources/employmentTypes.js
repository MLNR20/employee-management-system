import {
  useEmploymentTypes,
  useEmploymentTypesPage,
  useEmploymentType,
  useCreateEmploymentType,
  useUpdateEmploymentType,
  useRemoveEmploymentType,
} from "../hooks/useEntities";
import { statusColumn, dateColumn } from "./shared";

// --- Employment types: how employees are employed (Regular, Contractual...), assigned on the employee form ---

export const employmentTypeResource = {
  key: "employment-types",
  title: "Employment Types",
  singular: "Employment Type",
  basePath: "/employment-types",
  deleteNote:
    "The employment type is hidden and can no longer be assigned. Employees who already hold it keep it. Mark it inactive instead to keep it in this list.",
  hooks: {
    useList: useEmploymentTypes,
    usePage: useEmploymentTypesPage,
    useOne: useEmploymentType,
    useCreate: useCreateEmploymentType,
    useUpdate: useUpdateEmploymentType,
    useRemove: useRemoveEmploymentType,
  },
  columns: () => [
    { key: "name", header: "Name", sortKey: "name" },
    { key: "description", header: "Description", sortKey: "description" },
    statusColumn(),
    dateColumn("dateCreated", "Date created"),
    dateColumn("dateUpdated", "Date updated"),
  ],
  fields: [
    { name: "name", label: "Name", type: "text", required: true, maxLength: 60, hint: "For example: Regular, Probationary, Contractual." },
    { name: "description", label: "Description", type: "textarea", maxLength: 200 },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};
