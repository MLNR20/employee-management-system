// CRA inlines REACT_APP_* at build time. The browser talks to the published
// backend port (8080 in docker-compose), not the internal Docker hostname.
export const API_BASE_URL =
  process.env.REACT_APP_API_URL || "http://localhost:8080";
