import { createExporter } from "../infrastructure/export/exporterFactory";

const buttonClass =
  "text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 focus:ring-4 focus:ring-gray-200 font-medium rounded-lg text-sm px-4 py-2.5";

/**
 * Export buttons for a table. getTable() returns { filename, title?, headers, rows } (or a
 * promise of it, e.g. after fetching every row) and is called when a button is clicked.
 */
export default function ExportButtons({ getTable, formats = ["csv", "pdf"] }) {
  return (
    <div className="flex flex-row gap-2">
      {formats.map((format) => (
        <button
          key={format}
          type="button"
          className={buttonClass}
          onClick={async () => createExporter(format).export(await getTable())}
        >
          Export {format.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
