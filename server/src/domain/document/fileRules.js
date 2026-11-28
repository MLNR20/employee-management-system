import { ValidationError } from "../errors.js";
import { DEFAULT_FILE_LIMITS, inMegabytes } from "./fileLimits.js";

// A scanned or photographed copy of a document: what is accepted. How much can be stored is in fileLimits.

// What each accepted type starts with. The content decides the type: the name and the type the browser
// sends are never trusted.
const TYPES = [
  { contentType: "application/pdf", extensions: ["pdf"], signature: [0x25, 0x50, 0x44, 0x46, 0x2d] },
  { contentType: "image/png", extensions: ["png"], signature: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { contentType: "image/jpeg", extensions: ["jpg", "jpeg"], signature: [0xff, 0xd8, 0xff] },
];

export const ACCEPTED_CONTENT_TYPES = TYPES.map((type) => type.contentType);

const typeOf = (data) => TYPES.find((type) => type.signature.every((byte, i) => data[i] === byte));

/** The name without any folder or control characters, at most 100 long, ending in the right extension. */
const cleanName = (name, { extensions }) => {
  const base = String(name ?? "")
    .split(/[\\/]/)
    .pop()
    .replace(/[\u0000-\u001f\u007f"]/g, "")
    .trim();
  const extension = base.includes(".") ? base.split(".").pop().toLowerCase() : "";
  const stem = (extensions.includes(extension) ? base.slice(0, -(extension.length + 1)) : base).slice(0, 90) || "document";
  return `${stem}.${extensions.includes(extension) ? extension : extensions[0]}`;
};

/**
 * Checks an uploaded file and returns what to store about it.
 * @param {{name?: string, data?: Buffer}} file
 * @param {number} [maxBytes] the largest file accepted
 * @returns {{name: string, contentType: string, size: number, data: Buffer}}
 */
export function checkUpload({ name, data } = {}, maxBytes = DEFAULT_FILE_LIMITS.maxFileBytes) {
  if (!Buffer.isBuffer(data) || data.length === 0) throw new ValidationError("Send a PDF, PNG or JPEG file");
  if (data.length > maxBytes) throw new ValidationError(`The file is larger than ${inMegabytes(maxBytes)}`);
  const type = typeOf(data);
  if (!type) throw new ValidationError("Only PDF, PNG and JPEG files are accepted");
  return { name: cleanName(name, type), contentType: type.contentType, size: data.length, data };
}
