import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const borrowingsSchema = createEntitySchema({
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: "items", required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", required: true },
  borrowedAt: { type: Date, default: Date.now },
  returnedAt: { type: Date, default: null },
});

borrowingsSchema.index({ employeeId: 1 });
borrowingsSchema.index({ itemId: 1, returnedAt: 1 });

export const BorrowingModel = mongoose.model("borrowings", borrowingsSchema);
