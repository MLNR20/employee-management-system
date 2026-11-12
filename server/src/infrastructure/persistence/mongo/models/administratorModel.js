import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const administratorsSchema = createEntitySchema({
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
    },
    // SHA-256 of the currently valid refresh token (rotated on every refresh).
    refreshTokenHash:{
        type: String,
        default: null,
        select: false
    }
});

export const AdministratorModel = mongoose.model("administrators", administratorsSchema);
