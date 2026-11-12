import { useAuditLogsPage, useAuditLog } from "../hooks/useEntities";
import { Badge } from "./shared";

const actionTones = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  login: "bg-gray-100 text-gray-700",
  logout: "bg-gray-100 text-gray-700",
  login_failed: "bg-red-100 text-red-700",
};

const label = (action) => String(action ?? "").replace(/_/g, " ");

/**
 * The audit trail. Read-only: the resource has no useCreate, useUpdate or useRemove,
 * so the list page shows no Add, Edit or Delete and no add or edit routes exist.
 */
export const auditLogResource = {
  key: "audit-logs",
  title: "Audit Logs",
  singular: "Audit Log",
  basePath: "/audit-logs",
  hooks: {
    usePage: useAuditLogsPage,
    useOne: useAuditLog,
  },
  columns: () => [
    {
      key: "dateCreated",
      header: "When",
      sortKey: "createdAt",
      render: (log) => (log.dateCreated ? log.dateCreated.toLocaleString() : ""),
    },
    { key: "actorName", header: "Who", sortKey: "actorName" },
    {
      key: "action",
      header: "Action",
      sortKey: "action",
      render: (log) => <Badge value={label(log.action)} tones={{ [label(log.action)]: actionTones[log.action] }} />,
    },
    { key: "resource", header: "Area", sortKey: "resource" },
    { key: "resourceId", header: "Record", sortKey: "resourceId" },
    { key: "statusCode", header: "Result", sortKey: "statusCode" },
    { key: "ip", header: "IP address", sortKey: "ip" },
  ],
  fields: [],
};
