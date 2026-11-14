import {
  useEmergencyContacts,
  useEmergencyContactsPage,
  useEmergencyContact,
  useCreateEmergencyContact,
  useUpdateEmergencyContact,
  useRemoveEmergencyContact,
  useEmployees,
} from "../hooks/useEntities";
import { personNameSchema } from "../validation/personName";
import { validatePhone } from "../validation/phone";
import { statusColumn, nameOf } from "./shared";

const employeeOption = { useList: useEmployees, value: (e) => e.id, label: (e) => e.fullName };

// --- Emergency contacts: the people to call for an employee (one employee, many contacts) ------

export const emergencyContactResource = {
  key: "emergency-contacts",
  title: "Emergency Contacts",
  singular: "Emergency Contact",
  basePath: "/emergency-contacts",
  hooks: {
    useList: useEmergencyContacts,
    usePage: useEmergencyContactsPage,
    useOne: useEmergencyContact,
    useCreate: useCreateEmergencyContact,
    useUpdate: useUpdateEmergencyContact,
    useRemove: useRemoveEmergencyContact,
  },
  useExtras: () => ({ employees: useEmployees().data }),
  columns: ({ employees }) => [
    { key: "employee", header: "Employee", accessor: (c) => nameOf(employees, c.employeeId, (e) => e.fullName) },
    { key: "firstName", header: "First name", sortKey: "firstName" },
    { key: "lastName", header: "Last name", sortKey: "lastName" },
    { key: "relationship", header: "Relationship", sortKey: "relationship" },
    { key: "phoneNumber", header: "Phone", sortKey: "phoneNumber" },
    { key: "email", header: "Email", sortKey: "email" },
    statusColumn(),
  ],
  fields: [
    { name: "employeeId", label: "Employee", type: "select", required: true, lockOnEdit: true, optionsFrom: employeeOption },
    { name: "firstName", label: "First name", type: "text", required: true, schema: personNameSchema("First name") },
    { name: "lastName", label: "Last name", type: "text", required: true, schema: personNameSchema("Last name") },
    { name: "relationship", label: "Relationship", type: "text", required: true, maxLength: 50, hint: "For example: Mother, Spouse, Friend." },
    { name: "phoneNumber", label: "Phone number", type: "text", required: true, validate: validatePhone },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Address", type: "textarea", maxLength: 200 },
    { name: "isActive", label: "Active", type: "checkbox", default: true },
  ],
};
