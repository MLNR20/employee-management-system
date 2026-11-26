import http from 'http';
import mongoose from 'mongoose';
import config from './src/infrastructure/config/config.js';
import * as useCases from './src/container.js';
import { createApp } from './src/presentation/http/app.js';
import { createSocketServer } from './src/infrastructure/realtime/createSocketServer.js';

const DATABASE_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
const app = createApp({
    ...useCases,
    corsOrigins: config.CORS_ORIGINS,
    rateLimits: {
        api: { windowMs: config.RATE_LIMIT_WINDOW_MS, max: config.RATE_LIMIT_MAX },
        auth: { windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS, max: config.AUTH_RATE_LIMIT_MAX },
        trustProxy: config.TRUST_PROXY
    },
    getHealth: () => ({ database: DATABASE_STATES[mongoose.connection.readyState] ?? 'unknown' })
});

// Socket.IO shares the HTTP port, so the app is served from an http.Server rather than app.listen.
const httpServer = http.createServer(app);
useCases.notificationPublisher.attach(
    createSocketServer(httpServer, {
        authUseCases: useCases.authUseCases,
        employeeAuthUseCases: useCases.employeeAuthUseCases,
        corsOrigins: config.CORS_ORIGINS,
    })
);

httpServer.listen(config.PORT, () =>{
    console.log('SERVER RUNNING PERFECTLY');
})

// Log connection status
mongoose.connect(config.dbConnection).then(async ()=>{
    console.log('App connected to database');
    // Permissions are enforced, so somebody must always be able to grant them.
    await useCases.authUseCases.ensureAdministratorsExist();
    const { granted } = await useCases.accessUseCases.ensureAccessManager();
    if (granted) console.log(`No administrator could manage access: gave full access to "${granted}"`);
    // Creates the standard onboarding or offboarding checklist when that stage has no requirements yet.
    return useCases.documentRequirementUseCases.ensureDefaultRequirements().then(({ created }) => {
        if (created) console.log(`Created ${created} default document requirements`);
    });
}).catch((error) =>{
    console.log(error);
});
