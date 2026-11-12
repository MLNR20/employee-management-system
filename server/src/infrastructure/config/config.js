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
    ACCESS_TOKEN_TTL: process.env.ACCESS_TOKEN_TTL || '15m',
    REFRESH_TOKEN_TTL: process.env.REFRESH_TOKEN_TTL || '7d'
}

export default config;
