import { createExporter, exportFormats } from "./exporterFactory";
import { CsvExporter } from "./CsvExporter";
import { PdfExporter } from "./PdfExporter";

test("creates the exporter for each format, ignoring case", () => {
  expect(createExporter("csv")).toBeInstanceOf(CsvExporter);
  expect(createExporter("PDF")).toBeInstanceOf(PdfExporter);
  expect(exportFormats).toEqual(["csv", "pdf"]);
});

test("rejects an unknown format", () => {
  expect(() => createExporter("xml")).toThrow(/Unsupported export format/);
});

test("csv quotes special characters and neutralises formulas", () => {
  const csv = createExporter("csv").toCsv({
    headers: ["Name", "Note"],
    rows: [["Reyes, Ava", 'said "hi"'], ["=SUM(A1)", null]],
  });
  expect(csv).toBe('Name,Note\r\n"Reyes, Ava","said ""hi"""\r\n\'=SUM(A1),');
});
