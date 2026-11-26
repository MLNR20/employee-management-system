import { resolveSecrets } from "./secrets.js";

// Reads server/.env when it exists (Node 20.12+). Variables already in the environment, such as the ones
// docker-compose passes, take priority over the file.
try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

//MONGO_URI=mongodb://admin:secret@mongodb:27017/employees?authSource=admin

// Never a built-in default: see secrets.js.
const secrets = resolveSecrets(process.env);

export const config = {
    PORT: process.env.PORT || 3002,
    dbConnection: process.env.MONGO_URI,

    // Seed administrator, created on first run when no administrators exist.
    seedAdministrator: {
        username: process.env.USERNAME,
        password: process.env.PASSWORD,
        first_name: process.env.FIRST_NAME,
        last_name: process.env.LAST_NAME,
        email: process.env.EMAIL
    },

    // Auth tokens: short-lived access token + long-lived, rotating refresh token.
    JWT_SECRET: secrets.JWT_SECRET,
    REFRESH_TOKEN_SECRET: secrets.REFRESH_TOKEN_SECRET,
    // Employee portal tokens use their own secret so they can never be used as administrator tokens.
    EMPLOYEE_JWT_SECRET: secrets.EMPLOYEE_JWT_SECRET,
    EMPLOYEE_TOKEN_TTL: process.env.EMPLOYEE_TOKEN_TTL || '8h',
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',

    // The workplace clock for shifts, lateness and the working day: UTC plus this many minutes.
    // Default 480 = UTC+8 (Philippines, no daylight saving).
    WORK_UTC_OFFSET_MINUTES: Number(process.env.WORK_UTC_OFFSET_MINUTES ?? 480),

    // Rate limiting, per client IP. The general limit covers the whole API; the auth limit is the stricter
    // one for sign-in, registration and token refresh (only failed attempts count).
    RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX ?? 300),
    AUTH_RATE_LIMIT_WINDOW_MS: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    AUTH_RATE_LIMIT_MAX: Number(process.env.AUTH_RATE_LIMIT_MAX ?? 10),
    // Number of reverse proxies in front of the server (Render's is 1). Without it every request appears to
    // come from the proxy's address and one busy client would exhaust the limit for everybody. 0 = no proxy.
    TRUST_PROXY: Number(process.env.TRUST_PROXY ?? 0),

    // Web addresses allowed to call the API from a browser, comma-separated, e.g.
    // CORS_ORIGINS=https://hr.example.com,http://localhost:3000. Empty allows every origin.
    CORS_ORIGINS: (process.env.CORS_ORIGINS ?? '').split(',').map((origin) => origin.trim()).filter(Boolean)
}

export default config;
