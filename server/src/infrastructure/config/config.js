// Reads server/.env when it exists (Node 20.12+). Variables already in the environment, such as the ones
// docker-compose passes, take priority over the file.
try {
    process.loadEnvFile(new URL("../../../.env", import.meta.url));
} catch (error) {
    if (error.code !== "ENOENT") throw error;
}

//MONGO_URI=mongodb://admin:secret@mongodb:27017/employees?authSource=admin

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
    JWT_SECRET: process.env.JWT_SECRET || 'secret123',
    REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET || 'refresh-secret123',
    // Employee portal tokens use their own secret so they can never be used as administrator tokens.
    EMPLOYEE_JWT_SECRET: process.env.EMPLOYEE_JWT_SECRET || 'employee-secret123',
    EMPLOYEE_TOKEN_TTL: process.env.EMPLOYEE_TOKEN_TTL || '8h',
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d',

    // The workplace clock for shifts, lateness and the working day: UTC plus this many minutes.
    // Default 480 = UTC+8 (Philippines, no daylight saving).
    WORK_UTC_OFFSET_MINUTES: Number(process.env.WORK_UTC_OFFSET_MINUTES ?? 480)
}

export default config;
