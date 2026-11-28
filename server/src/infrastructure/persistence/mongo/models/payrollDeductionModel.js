import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { DeductionBase, DeductionMethod } from "../../../../domain/payroll/deductionRules.js";

const bracketSchema = new mongoose.Schema(
  {
    from: { type: Number, required: true, min: 0 },
    base: { type: Number, required: true, min: 0 },
    percent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const payrollDeductionsSchema = createEntitySchema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    method: { type: String, required: true, enum: Object.values(DeductionMethod) },
    base: { type: String, enum: Object.values(DeductionBase), default: DeductionBase.GROSS },
    amount: { type: Number, default: null },
    percent: { type: Number, default: null },
    minAmount: { type: Number, default: null },
    maxAmount: { type: Number, default: null },
    brackets: { type: [bracketSchema], default: [] },
  }
);

export const PayrollDeductionModel = mongoose.model("payrolldeductions", payrollDeductionsSchema);
