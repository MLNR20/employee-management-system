import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const salaryRatesSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  hourlyRate: { type: Number, required: true, min: 0 },
  // First day the rate applies, as "YYYY-MM-DD" (UTC). Text in this form sorts and compares as a date.
  effectiveFrom: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "administrators", required: true },
  remarks: { type: String, trim: true, default: "" },
});

salaryRatesSchema.index({ employeeId: 1, effectiveFrom: -1 });

export const SalaryRateModel = mongoose.model("salaryrates", salaryRatesSchema);
