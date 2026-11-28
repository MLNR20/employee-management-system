import { ValidationError } from "../errors.js";

// How much can be uploaded. Files live in the database and removed ones are kept (soft delete), so
// there is a limit for one file, for each employee's current files, and for everything stored.

const MB = 1024 * 1024;

/** A MongoDB document holds at most 16 MB, so no setting can allow a larger file than this. */
export const MAX_ALLOWED_FILE_MB = 15;

export const DEFAULT_FILE_LIMITS = Object.freeze({
  maxFileBytes: 5 * MB,
  maxFilesPerEmployee: 25,
  maxEmployeeBytes: 50 * MB,
  maxTotalBytes: 400 * MB, // within a free MongoDB Atlas cluster's 512 MB
});

const SETTINGS = [
  ["maxFileBytes", "DOCUMENT_MAX_FILE_MB", MB],
  ["maxFilesPerEmployee", "DOCUMENT_MAX_FILES_PER_EMPLOYEE", 1],
  ["maxEmployeeBytes", "DOCUMENT_MAX_MB_PER_EMPLOYEE", MB],
  ["maxTotalBytes", "DOCUMENT_MAX_TOTAL_MB", MB],
];

/**
 * The limits from the environment. A setting that is not a whole number above zero is ignored with a
 * warning, and the size of one file is capped at MAX_ALLOWED_FILE_MB.
 *
 * @param {Record<string, string | undefined>} [env]
 * @param {(message: string) => void} [warn]
 * @returns {typeof DEFAULT_FILE_LIMITS}
 */
export const resolveFileLimits = (env = {}, warn = console.warn) => {
  const limits = { ...DEFAULT_FILE_LIMITS };
  for (const [limit, name, unit] of SETTINGS) {
    if (env[name] === undefined || env[name].trim() === "") continue;
    const value = Number(env[name]);
    if (!Number.isInteger(value) || value <= 0) {
      warn(`WARNING: ${name} must be a whole number above 0; using the default.`);
      continue;
    }
    limits[limit] = value * unit;
  }
  if (limits.maxFileBytes > MAX_ALLOWED_FILE_MB * MB) {
    warn(`WARNING: DOCUMENT_MAX_FILE_MB is capped at ${MAX_ALLOWED_FILE_MB}.`);
    limits.maxFileBytes = MAX_ALLOWED_FILE_MB * MB;
  }
  return Object.freeze(limits);
};

/** "5 MB", "1.5 MB", "under 0.1 MB": a size as the messages say it. */
export const inMegabytes = (bytes) => {
  const rounded = Math.round((bytes / MB) * 10) / 10;
  return bytes > 0 && rounded === 0 ? "under 0.1 MB" : `${rounded} MB`;
};

/**
 * Throws ValidationError when storing one more file would break a limit. (The size of the file itself
 * is checked with its content, see fileRules.)
 *
 * @param {Object} upload
 * @param {number} upload.size of the new file
 * @param {{size: number} | null} upload.replacing the file the new one takes the place of
 * @param {{count: number, bytes: number}} upload.usage the employee's current files
 * @param {number} upload.totalBytes everything stored, removed files included
 * @param {typeof DEFAULT_FILE_LIMITS} limits
 */
export function assertWithinLimits({ size, replacing, usage, totalBytes }, limits) {
  if (!replacing && usage.count >= limits.maxFilesPerEmployee) {
    throw new ValidationError(
      `This employee already has ${usage.count} file${usage.count === 1 ? "" : "s"}, ` +
        `and the limit is ${limits.maxFilesPerEmployee}. Remove one first.`
    );
  }
  if (usage.bytes - (replacing?.size ?? 0) + size > limits.maxEmployeeBytes) {
    throw new ValidationError(
      `This would take the employee's files past ${inMegabytes(limits.maxEmployeeBytes)} ` +
        `(${inMegabytes(usage.bytes)} used). Remove a file or upload a smaller one.`
    );
  }
  if (totalBytes + size > limits.maxTotalBytes) {
    throw new ValidationError(
      `File storage is full: the limit is ${inMegabytes(limits.maxTotalBytes)}, removed files included. ` +
        "Whoever runs the server can raise DOCUMENT_MAX_TOTAL_MB."
    );
  }
}
