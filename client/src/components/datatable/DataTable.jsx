import { useMemo, useState } from "react";

/**
 * Reusable table with search, sorting and pagination, all client-side.
 *
 * columns: [{
 *   key:        property name on the row (also the column id)
 *   header:     heading text
 *   accessor?:  (row) => value used for sorting and searching (default row[key])
 *   render?:    (row, index) => node to show instead of the raw value;
 *               index is the row's position in the filtered, sorted list
 *   sortable?:  default true when the column has a value to sort on
 *   searchable?: default true when the column has a value to search
 * }]
 */
export default function DataTable({
  columns,
  data = [],
  getRowId = (row) => row.id,
  isLoading = false,
  error = null,
  emptyMessage = "No records found.",
  searchable = true,
  pageSizeOptions = [5, 10, 25],
  initialPageSize = 10,
}) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, direction: "asc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const valueOf = (row, column) => (column.accessor ? column.accessor(row) : row[column.key]);
  const hasValue = (column) => Boolean(column.accessor) || data.some((row) => column.key in row);

  const rows = useMemo(() => {
    const needle = search.toLowerCase().replace(/\s+/g, " ").trim();

    let result = data;
    if (needle) {
      const searchColumns = columns.filter((c) => c.searchable !== false && hasValue(c));
      result = data.filter((row) =>
        searchColumns
          .map((column) => valueOf(row, column))
          .filter((value) => value !== undefined && value !== null)
          .map((value) => (value instanceof Date ? value.toLocaleDateString() : String(value)))
          .join(" ")
          .toLowerCase()
          .includes(needle)
      );
    }

    if (sort.key) {
      const column = columns.find((c) => c.key === sort.key);
      const factor = sort.direction === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => factor * compare(valueOf(a, column), valueOf(b, column)));
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columns, search, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * pageSize;
  const visibleRows = rows.slice(start, start + pageSize);

  const toggleSort = (key) =>
    setSort((previous) => {
      if (previous.key !== key) return { key, direction: "asc" };
      if (previous.direction === "asc") return { key, direction: "desc" };
      return { key: null, direction: "asc" };
    });

  if (isLoading) return <p className="text-sm text-gray-500 p-4">Loading...</p>;
  if (error) return <p className="text-sm text-red-600 p-4">Something went wrong loading the data.</p>;

  return (
    <div>
      {searchable && (
        <div className="mb-6 flex flex-row">
          <label htmlFor="datatable-search" className="block mb-2 mt-4 text-sm mr-2 text-gray-500">
            Search:
          </label>
          <input
            type="text"
            id="datatable-search"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-72 p-2.5 h-10 mt-2"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
          />
        </div>
      )}

      <table className="text-sm w-full text-left text-gray-500">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => {
              const sortable = column.sortable ?? hasValue(column);
              const active = sort.key === column.key;
              return (
                <th
                  key={column.key}
                  className="px-6 py-3"
                  aria-sort={
                    active ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                  }
                >
                  {sortable ? (
                    <button
                      type="button"
                      className="font-bold flex items-center gap-1"
                      onClick={() => toggleSort(column.key)}
                    >
                      {column.header}
                      <span aria-hidden="true" className="text-xs text-gray-400">
                        {active ? (sort.direction === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {visibleRows.length === 0 ? (
            <tr>
              <td className="px-6 py-4 text-center" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            visibleRows.map((row, i) => (
              <tr key={getRowId(row)} className="odd:bg-white even:bg-gray-50">
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4">
                    {column.render ? column.render(row, start + i) : valueOf(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <label htmlFor="datatable-page-size">Rows per page:</label>
          <select
            id="datatable-page-size"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <span>
          {rows.length === 0 ? 0 : start + 1}-{Math.min(start + pageSize, rows.length)} of{" "}
          {rows.length}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-3 py-1.5 border border-gray-300 rounded-lg"
            style={{ opacity: currentPage === 0 ? 0.5 : 1 }}
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="px-3 py-1.5 border border-gray-300 rounded-lg"
            style={{ opacity: currentPage >= pageCount - 1 ? 0.5 : 1 }}
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// Missing values sort last; numbers and dates compare by value, everything else as text.
function compare(a, b) {
  const aMissing = a === undefined || a === null || a === "";
  const bMissing = b === undefined || b === null || b === "";
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}
