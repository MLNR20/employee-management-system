import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { softDeletePlugin } from "./softDelete.js";

// An employee has many emergency contacts; each one points back at its employee.
const emergencyContactsSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  relationship: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true, default: "" },
  address: { type: String, trim: true, default: "" },
  phoneNumber: { type: String, required: true, trim: true },
});

emergencyContactsSchema.plugin(softDeletePlugin);
emergencyContactsSchema.index({ employeeId: 1 });

export const EmergencyContactModel = mongoose.model("emergencycontacts", emergencyContactsSchema);
