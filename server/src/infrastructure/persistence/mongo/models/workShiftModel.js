import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const workShiftsSchema = createEntitySchema({
  name: { type: String, required: true, trim: true },
  startTime: { type: String, required: true }, // "HH:MM", workplace local time
  endTime: { type: String, required: true },
  lunchMinutes: { type: Number, default: 60, min: 0, max: 240 },
  graceMinutes: { type: Number, default: 0, min: 0, max: 120 },
  workDays: { type: [Number], default: [1, 2, 3, 4, 5] }, // 0 = Sunday ... 6 = Saturday
  // Soft delete: set when the shift is deleted. Deleted shifts are hidden from every query.
  deletedAt: { type: Date, default: null },
  // What makes a shift unique (see domain/shift/shiftRules.js). They exist only while the shift is
  // live and are removed on delete, so the sparse unique indexes below free the name and schedule.
  nameKey: { type: String },
  scheduleKey: { type: String },
});

workShiftsSchema.index({ nameKey: 1 }, { unique: true, sparse: true });
workShiftsSchema.index({ scheduleKey: 1 }, { unique: true, sparse: true });

export const WorkShiftModel = mongoose.model("workshifts", workShiftsSchema);

const shiftAssignmentsSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "workshifts", required: true },
  // First day the shift applies, "YYYY-MM-DD". Text in this form sorts and compares as a date.
  effectiveFrom: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "administrators", required: true },
});

shiftAssignmentsSchema.index({ employeeId: 1, effectiveFrom: -1 });
shiftAssignmentsSchema.index({ shiftId: 1 });

export const ShiftAssignmentModel = mongoose.model("shiftassignments", shiftAssignmentsSchema);
