import mongoose from "mongoose";

const administratorsSchema =  mongoose.Schema({
    first_name: {
        type: String,
        required: true,
        trim: true
    },
    last_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    username:{
        type: String,
        required:true,
        unique: true,
        trim:true
    },
    password:{
        type: String,
        required: true,
    }
})

export const Administrator = mongoose.model("administrators", administratorsSchema)
