import Swal from "sweetalert2";
import { documentChecklistUseCases } from "../container";

/** A button that downloads an uploaded document copy. `file` is { id, name }. */
export default function DocumentFileLink({ file }) {
  const download = () =>
    documentChecklistUseCases
      .download(file)
      .catch(() => Swal.fire("Could not download", "The file may have been removed.", "error"));

  return (
    <button type="button" onClick={download} className="text-blue-700 text-left font-medium hover:underline" style={{ overflowWrap: "anywhere" }}>
      {file.name}
    </button>
  );
}
