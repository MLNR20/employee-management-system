import { CsvExporter } from "./CsvExporter";
import { PdfExporter } from "./PdfExporter";

/**
 * Factory for table exporters. Every exporter has the same method,
 *   exporter.export({ filename, title?, headers: string[], rows: any[][] })
 * so callers pick a format by name and never import a concrete exporter.
 *
 *   createExporter("csv").export({ filename: "employees", headers, rows });
 *
 * To support a new format, add a class with that method and register it below.
 */
const exporters = {
  csv: CsvExporter,
  pdf: PdfExporter,
};

export const exportFormats = Object.keys(exporters);

export function createExporter(format) {
  const Exporter = exporters[String(format).toLowerCase()];
  if (!Exporter) {
    throw new Error(`Unsupported export format "${format}". Use one of: ${exportFormats.join(", ")}.`);
  }
  return new Exporter();
}
