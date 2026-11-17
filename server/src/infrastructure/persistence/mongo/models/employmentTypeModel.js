import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const employmentTypesSchema = createEntitySchema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
    default: "",
  },
  // Soft delete: set when the type is deleted. Deleted types are hidden from every query.
  deletedAt: { type: Date, default: null },
  // What makes a name unique (see domain/employmentType/employmentTypeRules.js). It exists only while
  // the type is live and is removed on delete, so the sparse unique index frees the name for reuse.
  nameKey: { type: String },
});

employmentTypesSchema.index({ nameKey: 1 }, { unique: true, sparse: true });

export const EmploymentTypeModel = mongoose.model("employmenttypes", employmentTypesSchema);
