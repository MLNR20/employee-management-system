import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const documentRequirementsSchema = createEntitySchema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  isRequired: { type: Boolean, default: true },
  hasExpiry: { type: Boolean, default: false },
  stage: { type: String, enum: ["onboarding", "offboarding"], default: "onboarding" },
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
  // Set only by an upload: { id, name, contentType, size, uploadedBy, uploadedAt }.
  file: { type: mongoose.Schema.Types.Mixed, default: null },
});

// One record per employee and requirement.
employeeDocumentsSchema.index({ employeeId: 1, requirementId: 1 }, { unique: true });
employeeDocumentsSchema.index({ requirementId: 1 });

export const EmployeeDocumentModel = mongoose.model("employeedocuments", employeeDocumentsSchema);

// The uploaded copies themselves (at most 5 MB each, well within MongoDB's document limit).
const documentFilesSchema = createEntitySchema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true, index: true },
  name: { type: String, required: true },
  contentType: { type: String, required: true },
  size: { type: Number, required: true },
  data: { type: Buffer, required: true },
});

export const DocumentFileModel = mongoose.model("documentfiles", documentFilesSchema);
