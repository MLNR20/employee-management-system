import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const attendancesSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  // The working day as "YYYY-MM-DD" (UTC), taken from timeIn.
  date: { type: String, required: true },
  timeIn: { type: Date, required: true },
  lunchOut: { type: Date, default: null },
  lunchIn: { type: Date, default: null },
  timeOut: { type: Date, default: null },
  // Copied from the employee at time in, so later raises do not change past days.
  hourlyRate: { type: Number, required: true, min: 0 },
  hoursWorked: { type: Number, default: null, min: 0 },
});

// One record per employee per day. A write that races a second time in fails here.
attendancesSchema.index({ employeeId: 1, date: 1 }, { unique: true });
attendancesSchema.index({ employeeId: 1, timeOut: 1 });

export const AttendanceModel = mongoose.model("attendances", attendancesSchema);
