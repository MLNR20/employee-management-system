// Placeholders shown while a table's content is on its way (the ".skeleton" style is in index.css).

// Varied widths so the placeholder rows look like real content rather than a solid block.
const WIDTHS = ["60%", "80%", "45%", "70%", "55%"];

/** One placeholder bar. Give a fixed width (e.g. "6rem") where the space around it has no width of its own. */
export function SkeletonBar({ width = "70%" }) {
  return <span className="skeleton" aria-hidden="true" style={{ width }} />;
}

/** Placeholder rows for a table body. */
export function SkeletonRows({ rows, columns, rowClassName, cellClassName }) {
  return Array.from({ length: rows }, (_, rowIndex) => (
    <tr key={`skeleton-${rowIndex}`} className={rowClassName}>
      {Array.from({ length: columns }, (__, columnIndex) => (
        <td key={columnIndex} className={cellClassName}>
          <SkeletonBar width={WIDTHS[(rowIndex + columnIndex) % WIDTHS.length]} />
        </td>
      ))}
    </tr>
  ));
}

/**
 * A whole table of placeholders, for the plain tables (DataTable draws its own).
 * `headers` is the list of column headings, or how many columns there are when they are not yet known.
 */
export default function TableSkeleton({ headers, rows = 5, label = "Loading" }) {
  const columns = Array.isArray(headers) ? headers : Array.from({ length: headers }, () => null);

  return (
    <div role="status" aria-busy="true" className="overflow-x-auto border border-gray-200 rounded-lg">
      <span className="sr-only">{label}…</span>
      <table className="w-full text-sm text-left" aria-hidden="true">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50">
          <tr>
            {columns.map((header, index) => (
              <th key={header ?? index} className="px-4 py-3">
                {header ?? <SkeletonBar width="4.5rem" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <SkeletonRows rows={rows} columns={columns.length} rowClassName="border-t border-gray-100" cellClassName="px-4 py-3" />
        </tbody>
      </table>
    </div>
  );
}
