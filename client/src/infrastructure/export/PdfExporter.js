import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/** Downloads a table as a .pdf file, with the title above it when one is given. */
export class PdfExporter {
  extension = "pdf";

  export({ filename, title, headers, rows }) {
    const doc = new jsPDF({ orientation: "landscape" });
    if (title) {
      doc.setFontSize(16);
      doc.text(title, 14, 16);
    }
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => row.map((cell) => (cell === undefined || cell === null ? "" : String(cell)))),
      startY: title ? 22 : 14,
      styles: { fontSize: 9 },
    });
    doc.save(`${filename}.${this.extension}`);
  }
}
