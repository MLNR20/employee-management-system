import { useEffect, useMemo, useState } from "react";

/**
 * Reusable table with search, sorting and pagination.
 *
 * Client mode (default): pass every row in `data`; search, sort and paging happen in the browser.
 * Server mode: pass `server` (from useServerTable) and `total`. `data` is then just the current
 * page, and search, sort and paging are asked of the server through server.params.
 *
 * columns: [{
 *   key:        property name on the row (also the column id)
 *   header:     heading text
 *   accessor?:  (row) => value used for sorting and searching in client mode (default row[key])
 *   render?:    (row, index) => node to show instead of the raw value;
 *               index is the row's position in the whole (filtered, sorted) list
 *   sortKey?:   server mode: the field the server sorts on. A column without one is not sortable.
 *   sortable?:  client mode: default true when the column has a value to sort on
 *   searchable?: client mode: default true when the column has a value to search
 * }]
 */
export default function DataTable({
  columns,
  data = [],
  getRowId = (row) => row.id,
  isLoading = false,
  isFetching = false,
  error = null,
  emptyMessage = "No records found.",
  searchable = true,
  pageSizeOptions = [5, 10, 25],
  initialPageSize = 10,
  server = null,
  total = 0,
}) {
  const isServer = Boolean(server);

  const [search, setSearch] = useState("");
  const [clientSort, setClientSort] = useState({ key: null, direction: "asc" });
  const [clientPage, setClientPage] = useState(0);
  const [clientPageSize, setClientPageSize] = useState(initialPageSize);

  // Server mode: wait for a pause in typing before asking the server.
  const setServerSearch = server?.setSearch;
  useEffect(() => {
    if (!setServerSearch) return undefined;
    const timer = setTimeout(() => setServerSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search, setServerSearch]);

  const valueOf = (row, column) => (column.accessor ? column.accessor(row) : row[column.key]);
  const hasValue = (column) => Boolean(column.accessor) || data.some((row) => column.key in row);

  // Client mode only: filter and sort every row in the browser.
  const rows = useMemo(() => {
    if (isServer) return data;

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

    if (clientSort.key) {
      const column = columns.find((c) => c.key === clientSort.key);
      const factor = clientSort.direction === "asc" ? 1 : -1;
      result = [...result].sort((a, b) => factor * compare(valueOf(a, column), valueOf(b, column)));
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServer, data, columns, search, clientSort]);

  const pageSize = isServer ? server.pageSize : clientPageSize;
  const totalRows = isServer ? total : rows.length;
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(isServer ? server.page - 1 : clientPage, pageCount - 1); // zero-based
  const start = currentPage * pageSize;
  const visibleRows = isServer ? rows : rows.slice(start, start + pageSize);

  // Server mode: if the last page disappears (e.g. its only row was deleted), step back.
  const serverPage = server?.page;
  const setServerPage = server?.setPage;
  useEffect(() => {
    if (isServer && !isLoading && serverPage > pageCount) setServerPage(pageCount);
  }, [isServer, isLoading, serverPage, pageCount, setServerPage]);

  const sort = isServer ? server.sort : clientSort;
  const setSort = isServer ? server.setSort : setClientSort;
  const sortKeyOf = (column) => (isServer ? column.sortKey : column.key);
  const isSortable = (column) =>
    isServer ? Boolean(column.sortKey) && column.sortable !== false : column.sortable ?? hasValue(column);

  const goToPage = (zeroBased) => (isServer ? server.setPage(zeroBased + 1) : setClientPage(zeroBased));

  const changePageSize = (size) => {
    if (isServer) {
      server.setPageSize(size);
    } else {
      setClientPageSize(size);
      setClientPage(0);
    }
  };

  const toggleSort = (key) => {
    if (sort.key !== key) return setSort({ key, direction: "asc" });
    if (sort.direction === "asc") return setSort({ key, direction: "desc" });
    return setSort({ key: null, direction: "asc" });
  };

  if (isLoading) return <p className="text-sm text-gray-500 p-4">Loading...</p>;
  if (error) return <p className="text-sm text-red-600 p-4">Something went wrong loading the data.</p>;

  return (
    <div>
      <div className="mb-6 flex flex-row flex-wrap items-center gap-6">
        {searchable && (
          <div className="flex flex-row items-center">
            <label htmlFor="datatable-search" className="block text-sm mr-2 text-gray-500">
              Search:
            </label>
            <input
              type="text"
              id="datatable-search"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-72 p-2.5 h-10"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setClientPage(0);
              }}
            />
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <label htmlFor="datatable-page-size">Rows per page:</label>
          <select
            id="datatable-page-size"
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg p-1.5 h-10"
            style={{ minWidth: "4.5rem" }}
            value={pageSize}
            onChange={(e) => changePageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <table
        className="text-sm w-full text-left text-gray-500"
        style={{ opacity: isFetching ? 0.6 : 1 }}
        aria-busy={isFetching}
      >
        <thead className="bg-gray-100">
          <tr>
            {columns.map((column) => {
              const sortable = isSortable(column);
              const sortKey = sortKeyOf(column);
              const active = sortable && sort.key === sortKey;
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
                      onClick={() => toggleSort(sortKey)}
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

      <div className="flex flex-wrap items-center justify-end gap-4 mt-4 text-sm text-gray-500">
        <div className="flex items-center gap-4">
          <span>
            Showing {totalRows === 0 ? 0 : start + 1}-{Math.min(start + pageSize, totalRows)} of{" "}
            {totalRows} rows
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-3 py-1.5 border border-gray-300 rounded-lg"
              style={{ opacity: currentPage === 0 ? 0.5 : 1 }}
              disabled={currentPage === 0}
              onClick={() => goToPage(currentPage - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="px-3 py-1.5 border border-gray-300 rounded-lg"
              style={{ opacity: currentPage >= pageCount - 1 ? 0.5 : 1 }}
              disabled={currentPage >= pageCount - 1}
              onClick={() => goToPage(currentPage + 1)}
            >
              Next
            </button>
          </div>
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
