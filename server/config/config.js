//MONGO_URI=mongodb://admin:secret@mongodb:27017/employees?authSource=admin
// export const dbConnection = "mongodb://admin:secret@mongodb:27017/employees?authSource=admin";

let config = {
    PORT: process.env.PORT || 3002,
    username: process.env.USERNAME,
    password: process.env.PASSWORD,
    first_name: process.env.FIRST_NAME,
    last_name: process.env.LAST_NAME,
    email: process.env.EMAIL,
    dbConnection: process.env.MONGO_URI
}

export default config;