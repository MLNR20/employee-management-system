import cors from "cors";

/**
 * Cross-origin rules for the API. With a list of allowed origins (the web app's address, e.g.
 * "https://hr.example.com"), browsers on any other site are refused; requests that send no Origin
 * header, such as curl or another server, are unaffected. With an empty list every origin is allowed,
 * which suits local development but should not be left that way on a public server.
 *
 * @param {string[]} [allowedOrigins]
 */
export const createCorsMiddleware = (allowedOrigins = []) =>
  cors(allowedOrigins.length > 0 ? { origin: allowedOrigins } : undefined);
