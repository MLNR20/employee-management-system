// The server checks every upload itself; these say so before sending. The limits are the server's: the
// checklist reports them, and the default is only used until it has.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export const inMegabytes = (bytes) => {
  const rounded = Math.round((bytes / (1024 * 1024)) * 10) / 10;
  return bytes > 0 && rounded === 0 ? "under 0.1 MB" : `${rounded} MB`;
};

/** Why a chosen file cannot be uploaded, or undefined when it can. */
export const fileError = ({ name = "", size = 0 } = {}, maxBytes = MAX_FILE_BYTES) => {
  if (!/\.(pdf|png|jpe?g)$/i.test(name)) return "Choose a PDF, PNG or JPEG file.";
  if (size > maxBytes) return `The file is larger than ${inMegabytes(maxBytes)}.`;
  return undefined;
};

/** The share of the system's file storage at which to start warning. */
const NEARLY_FULL = 0.8;

/**
 * The checklist's file limits in words. `files` is { count, bytes, totalBytes, maxFileBytes,
 * maxFilesPerEmployee, maxEmployeeBytes, maxTotalBytes }.
 * @returns {{usage: string, warning: string | null}}
 */
export const describeFileUsage = (files) => {
  const share = files.totalBytes / files.maxTotalBytes;
  return {
    usage:
      `Files: ${files.count} of ${files.maxFilesPerEmployee}, ` +
      `${inMegabytes(files.bytes)} of ${inMegabytes(files.maxEmployeeBytes)} used. ` +
      `PDF, PNG or JPEG up to ${inMegabytes(files.maxFileBytes)} each.`,
    warning:
      share >= NEARLY_FULL
        ? `File storage is ${Math.min(100, Math.floor(share * 100))}% full (${inMegabytes(files.totalBytes)} of ` +
          `${inMegabytes(files.maxTotalBytes)}, removed files included). Tell whoever runs the server.`
        : null,
  };
};
