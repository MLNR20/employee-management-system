// The server checks every upload itself; these say so before sending.
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_FILES = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

/** Why a chosen file cannot be uploaded, or undefined when it can. */
export const fileError = ({ name = "", size = 0 } = {}) => {
  if (!/\.(pdf|png|jpe?g)$/i.test(name)) return "Choose a PDF, PNG or JPEG file.";
  if (size > MAX_FILE_BYTES) return "The file is larger than 5 MB.";
  return undefined;
};
