import { downloadBlob } from "./download";

// Spreadsheet apps run cells that start with these as formulas; a leading ' makes them plain text.
const FORMULA_START = /^[=+\-@\t\r]/;

const escapeCell = (value) => {
  let text = value === undefined || value === null ? "" : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Downloads a table as a .csv file. */
export class CsvExporter {
  extension = "csv";

  toCsv({ headers, rows }) {
    return [headers, ...rows].map((row) => row.map(escapeCell).join(",")).join("\r\n");
  }

  export({ filename, headers, rows }) {
    // The BOM makes Excel read the file as UTF-8.
    const blob = new Blob(["\uFEFF", this.toCsv({ headers, rows })], {
      type: "text/csv;charset=utf-8",
    });
    downloadBlob(blob, `${filename}.${this.extension}`);
  }
}
