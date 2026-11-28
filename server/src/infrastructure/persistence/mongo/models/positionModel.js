import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const positionsSchema = createEntitySchema({
  name: { type: String, required: true, trim: true },
  departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "departments", required: true },
});

// A title appears once in a department.
positionsSchema.index({ departmentId: 1, name: 1 }, { unique: true });

export const PositionModel = mongoose.model("positions", positionsSchema);
