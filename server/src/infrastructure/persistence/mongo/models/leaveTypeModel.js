import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

const leaveTypesSchema = createEntitySchema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  isPaid: {
    type: Boolean,
    default: false
  }
});

export const LeaveTypeModel = mongoose.model("leavetypes", leaveTypesSchema);
