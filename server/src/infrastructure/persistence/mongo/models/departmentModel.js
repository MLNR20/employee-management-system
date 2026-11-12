import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const departmentsSchema = createEntitySchema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ""
  }
});

export const DepartmentModel = mongoose.model("departments", departmentsSchema);
