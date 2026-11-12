import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

// createdAt (from the base schema) is the moment the action happened.
const auditLogsSchema = createEntitySchema({
  actorId: { type: String, trim: true },
  actorName: { type: String, trim: true },
  action: { type: String, required: true, trim: true },
  resource: { type: String, trim: true },
  resourceId: { type: String, trim: true },
  method: { type: String, trim: true },
  path: { type: String, trim: true },
  statusCode: { type: Number },
  ip: { type: String, trim: true },
});

auditLogsSchema.index({ createdAt: -1 });

export const AuditLogModel = mongoose.model("auditlogs", auditLogsSchema);
