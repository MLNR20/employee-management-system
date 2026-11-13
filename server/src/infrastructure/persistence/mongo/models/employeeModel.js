import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const employeesSchema = createEntitySchema({
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
  position: {
    type: String,
    required: true,
    trim: true
  },
  department: {
    type: String,
    trim: true
  },
  salary: {
    type: Number,
    min: 0
  },
  hireDate: {
    type: Date,
    default: Date.now
  },
  // Hash of the employee portal password. Never returned unless a query asks for it with select("+passwordHash").
  passwordHash: { type: String, select: false },
  // Government ID numbers, digits only. Optional.
  sssNumber: { type: String, trim: true, default: "" },
  tinNumber: { type: String, trim: true, default: "" },
  philhealthNumber: { type: String, trim: true, default: "" },
  pagibigNumber: { type: String, trim: true, default: "" }
});

export const EmployeeModel = mongoose.model("employees", employeesSchema);
