import {
  useInventory,
  useInventoryPage,
  useInventoryItem,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useRemoveInventoryItem,
  useEmployees,
} from "../hooks/useEntities";
import { ItemStatus, itemStatusLabels } from "../domain/inventory/Item";
import { Badge, nameOf } from "./shared";

const statusTones = {
  [itemStatusLabels[ItemStatus.AVAILABLE]]: "bg-green-100 text-green-700",
  [itemStatusLabels[ItemStatus.IN_USE]]: "bg-blue-100 text-blue-700",
  [itemStatusLabels[ItemStatus.MAINTENANCE]]: "bg-yellow-100 text-yellow-700",
  [itemStatusLabels[ItemStatus.RETIRED]]: "bg-gray-100 text-gray-700",
};

const statusOptions = Object.values(ItemStatus).map((value) => ({ value, label: itemStatusLabels[value] }));

const money = (value) =>
  value === undefined || value === null ? "" : Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const inventoryResource = {
  key: "inventory",
  title: "Inventory",
  singular: "Item",
  addLabel: "Add Item",
  basePath: "/inventory",
  hooks: {
    useList: useInventory,
    usePage: useInventoryPage,
    useOne: useInventoryItem,
    useCreate: useCreateInventoryItem,
    useUpdate: useUpdateInventoryItem,
    useRemove: useRemoveInventoryItem,
  },
  useExtras: () => ({ employees: useEmployees().data }),
  columns: ({ employees }) => [
    { key: "name", header: "Item", sortKey: "name" },
    { key: "serialNumber", header: "Serial number", sortKey: "serialNumber" },
    { key: "category", header: "Category", sortKey: "category" },
    {
      key: "status",
      header: "Status",
      sortKey: "status",
      render: (item) => <Badge value={itemStatusLabels[item.status] ?? item.status} tones={statusTones} />,
    },
    {
      key: "assignedTo",
      header: "Assigned to",
      accessor: (item) =>
        item.assignedEmployeeId ? nameOf(employees, item.assignedEmployeeId, (e) => e.fullName) : "",
    },
    { key: "location", header: "Location", sortKey: "location" },
    { key: "purchaseDate", header: "Purchased", sortKey: "purchaseDate", render: (item) => item.purchaseDate ?? "" },
    { key: "purchaseCost", header: "Cost", sortKey: "purchaseCost", render: (item) => money(item.purchaseCost) },
  ],
  fields: [
    { name: "name", label: "Item name", type: "text", required: true },
    { name: "serialNumber", label: "Serial number", type: "text", required: true },
    { name: "category", label: "Category", type: "text", hint: "For example: Laptop, Monitor, Phone." },
    {
      name: "status",
      label: "Status",
      type: "select",
      required: true,
      default: ItemStatus.AVAILABLE,
      options: statusOptions,
      validate: (value, all) =>
        value === ItemStatus.IN_USE && !all.assignedEmployeeId ? "Choose the employee who holds this item." : undefined,
    },
    {
      name: "assignedEmployeeId",
      label: "Assigned to",
      type: "select",
      hint: "Only for items that are in use.",
      optionsFrom: { useList: useEmployees, value: (e) => e.id, label: (e) => e.fullName },
      validate: (value, all) =>
        all.status !== ItemStatus.IN_USE ? "Set the status to In use to assign this item." : undefined,
    },
    { name: "location", label: "Location", type: "text" },
    { name: "purchaseCost", label: "Purchase cost", type: "number", min: 0 },
    { name: "purchaseDate", label: "Purchase date", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ],
};
