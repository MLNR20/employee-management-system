// Column and lookup helpers shared by the resource configs.

export const statusColumn = () => ({
  key: "isActive",
  header: "Status",
  sortKey: "isActive",
  accessor: (row) => (row.isActive ? "Active" : "Inactive"),
  render: (row) => (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${
        row.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
      }`}
    >
      {row.isActive ? "Active" : "Inactive"}
    </span>
  ),
});

// The server stores the audit dates as createdAt / updatedAt.
const serverDateField = { dateCreated: "createdAt", dateUpdated: "updatedAt" };

export const dateColumn = (key, header) => ({
  key,
  header,
  sortKey: serverDateField[key] ?? key,
  accessor: (row) => row[key],
  render: (row) => (row[key] ? row[key].toLocaleDateString() : ""),
});

/** A coloured pill for a label such as a leave status. `tones` maps a value to Tailwind classes. */
export const Badge = ({ value, tones }) => (
  <span
    className={`px-2 py-1 rounded-full text-xs font-medium ${tones[value] ?? "bg-gray-100 text-gray-700"}`}
    style={{ textTransform: "capitalize" }}
  >
    {value}
  </span>
);

/** Looks an entity up by id in a loaded list and reads one property, e.g. nameOf(employees, id, e => e.fullName). */
export const nameOf = (list = [], id, read) => {
  const found = list.find((item) => item.id === id);
  return found ? read(found) : "(removed)";
};
