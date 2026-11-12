import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const objectIdRef = (ref) => ({ type: mongoose.Schema.Types.ObjectId, ref, required: true });

// --- Leave balance: one per employee and leave type -------------------------------------------

const leaveBalancesSchema = createEntitySchema({
  employeeId: objectIdRef("employees"),
  leaveTypeId: objectIdRef("leavetypes"),
  maxLeaves: { type: Number, required: true, min: 0 },
  availableLeaves: { type: Number, required: true, min: 0 },
});

leaveBalancesSchema.index({ employeeId: 1, leaveTypeId: 1 }, { unique: true });

export const LeaveBalanceModel = mongoose.model("leavebalances", leaveBalancesSchema);

// --- Leave request: a leave filed by an employee ------------------------------------------------

const leaveRequestsSchema = createEntitySchema({
  employeeId: objectIdRef("employees"),
  leaveTypeId: objectIdRef("leavetypes"),
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true, min: 0 },
  reason: { type: String, trim: true, default: "" },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected", "cancelled"],
    default: "pending",
    required: true,
  },
});

leaveRequestsSchema.index({ employeeId: 1 });

export const LeaveRequestModel = mongoose.model("leaverequests", leaveRequestsSchema);

// --- Leave approval: who decided a request ------------------------------------------------------

const leaveApprovalsSchema = createEntitySchema({
  leaveRequestId: objectIdRef("leaverequests"),
  approverId: objectIdRef("administrators"),
  decision: { type: String, enum: ["approved", "rejected"], required: true },
  remarks: { type: String, trim: true, default: "" },
});

leaveApprovalsSchema.index({ leaveRequestId: 1 });

export const LeaveApprovalModel = mongoose.model("leaveapprovals", leaveApprovalsSchema);
