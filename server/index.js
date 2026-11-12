import mongoose from 'mongoose';
import config from './src/infrastructure/config/config.js';
import * as useCases from './src/container.js';
import { createApp } from './src/presentation/http/app.js';

const app = createApp(useCases);

app.listen(config.PORT, () =>{
    console.log('SERVER RUNNING PERFECTLY');
})

// Log connection status
mongoose.connect(config.dbConnection).then(()=>{
    console.log('App connected to database');
}).catch((error) =>{
    console.log(error);
});
