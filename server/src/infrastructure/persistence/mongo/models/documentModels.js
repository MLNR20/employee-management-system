import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const documentRequirementsSchema = createEntitySchema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  isRequired: { type: Boolean, default: true },
  hasExpiry: { type: Boolean, default: false },
  // The name without case or surrounding spaces, so two requirements cannot differ only by those.
  nameKey: { type: String, required: true, unique: true },
});

export const DocumentRequirementModel = mongoose.model("documentrequirements", documentRequirementsSchema);

const employeeDocumentsSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: "documentrequirements", required: true },
  status: { type: String, enum: ["pending", "received", "verified", "rejected"], default: "received" },
  receivedAt: { type: Date, default: null },
  expiryDate: { type: String, default: null }, // "YYYY-MM-DD"
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "administrators", default: null },
  reviewedAt: { type: Date, default: null },
  remarks: { type: String, trim: true, default: "" },
});

// One record per employee and requirement.
employeeDocumentsSchema.index({ employeeId: 1, requirementId: 1 }, { unique: true });
employeeDocumentsSchema.index({ requirementId: 1 });

export const EmployeeDocumentModel = mongoose.model("employeedocuments", employeeDocumentsSchema);
