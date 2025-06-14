import express from 'express';
import mongoose  from 'mongoose';
import { config } from "./config/config.js";
import employeesRouter from './routes/employees.js';
import cors from 'cors';
import routerAdmin from './routes/admin.js';
const app = express();

app.use(cors());
app.listen(config.PORT, () =>{
    console.log('SERVER RUNNING PERFECTLY');
})


app.use(express.json());
app.use('/employees', employeesRouter);
app.use('/admin', routerAdmin);

// Log connection status
mongoose.connect(config.dbConnection).then(()=>{
    console.log('App connected to database');
}).catch((error) =>{
    console.log(error);
});