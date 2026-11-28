// Placeholders shown while content is on its way (the ".skeleton" style is in index.css).

// Varied widths so the placeholder rows look like real content rather than a solid block.
const WIDTHS = ["60%", "80%", "45%", "70%", "55%"];

/**
 * One placeholder bar. Give a fixed width (e.g. "6rem") where the space around it has no width of its own.
 * `style` shapes it further, e.g. a height or a round corner.
 */
export function SkeletonBar({ width = "70%", style }) {
  return <span className="skeleton" aria-hidden="true" style={{ width, ...style }} />;
}

/** Says what is loading to screen readers, around placeholder shapes that they skip. */
function Loading({ label, children }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Placeholder entries for a list of people and dates, each with a tag at the end. */
export function ListSkeleton({ rows = 3, label = "Loading" }) {
  return (
    <Loading label={label}>
      <ul className="list-none p-0 m-0 divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, index) => (
          <li key={index} className="flex items-start justify-between gap-3 py-3">
            <div className="flex flex-col gap-2" style={{ flex: 1 }}>
              <SkeletonBar width={WIDTHS[index % WIDTHS.length]} />
              <SkeletonBar width={WIDTHS[(index + 2) % WIDTHS.length]} style={{ height: "1rem" }} />
            </div>
            <SkeletonBar width="4.5rem" />
          </li>
        ))}
      </ul>
    </Loading>
  );
}

/** A placeholder for a line chart: its legend, then the plot at the chart's own proportions (800 by 320). */
export function ChartSkeleton({ label = "Loading the chart" }) {
  return (
    <Loading label={label}>
      <div className="flex gap-4 mb-2">
        <SkeletonBar width="5rem" />
        <SkeletonBar width="5rem" />
      </div>
      <SkeletonBar width="100%" style={{ height: "auto", aspectRatio: "800 / 320" }} />
    </Loading>
  );
}

/** A placeholder for a pie chart: the circle with its legend beside it. */
export function PieSkeleton({ slices = 4, label = "Loading the chart" }) {
  return (
    <Loading label={label}>
      <div className="flex flex-wrap items-center justify-center gap-8">
        <SkeletonBar width="220px" style={{ height: "220px", borderRadius: "9999px" }} />
        <div className="flex flex-col gap-3">
          {Array.from({ length: slices }, (_, index) => (
            <SkeletonBar key={index} width="10rem" />
          ))}
        </div>
      </div>
    </Loading>
  );
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
