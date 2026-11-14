import mongoose from 'mongoose';
import config from './src/infrastructure/config/config.js';
import * as useCases from './src/container.js';
import { createApp } from './src/presentation/http/app.js';

const DATABASE_STATES = ['disconnected', 'connected', 'connecting', 'disconnecting'];
const app = createApp({
    ...useCases,
    getHealth: () => ({ database: DATABASE_STATES[mongoose.connection.readyState] ?? 'unknown' })
});

app.listen(config.PORT, () =>{
    console.log('SERVER RUNNING PERFECTLY');
})

// Log connection status
mongoose.connect(config.dbConnection).then(()=>{
    console.log('App connected to database');
}).catch((error) =>{
    console.log(error);
});
