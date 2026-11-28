import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { softDeletePlugin } from "./softDelete.js";
import { OffboardingStatus, RehireStatus, SeparationType } from "../../../../domain/employee/separationRules.js";

// One offboarding. Written only by the offboarding use cases.
const separationSchema = new mongoose.Schema(
  {
    status: { type: String, enum: Object.values(OffboardingStatus), required: true },
    separationType: { type: String, enum: Object.values(SeparationType), required: true },
    lastWorkingDay: { type: String, required: true }, // "YYYY-MM-DD"
    reason: { type: String, default: "" },
    rehireNotes: { type: String, default: "" },
    startedBy: { type: String, default: null }, // administrator ids
    startedAt: { type: Date, default: null },
    updatedBy: { type: String, default: null },
    updatedAt: { type: Date, default: null },
    completedBy: { type: String, default: null },
    completedAt: { type: Date, default: null },
  },
  { _id: false }
);

const employeesSchema = createEntitySchema({
  // The employee's company-issued employment code (employee number). Optional.
  employmentCode: {
    type: String,
    trim: true,
    default: ""
  },
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
  pagibigNumber: { type: String, trim: true, default: "" },
  // The employee this one reports to. Points back at the same collection; null for someone at the top.
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", default: null },
  // How the employee is employed (Regular, Contractual...). Null when none is assigned.
  employmentTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "employmenttypes", default: null },
  // Whether the employee may be hired again; blank until tagged during offboarding.
  rehireStatus: { type: String, enum: ["", ...Object.values(RehireStatus)], default: "" },
  separation: { type: separationSchema, default: null },
  separationHistory: { type: [mongoose.Schema.Types.Mixed], default: [] }
});

employeesSchema.plugin(softDeletePlugin);
// Unique among employees who are not deleted: a deleted record does not hold on to its email.
employeesSchema.index({ email: 1, deletedAt: 1 }, { unique: true });
employeesSchema.index({ managerId: 1 });
employeesSchema.index({ employmentTypeId: 1 });

export const EmployeeModel = mongoose.model("employees", employeesSchema);
