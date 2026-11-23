import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

// createdAt (from the base schema) is the date the notification was created.
const notificationsSchema = createEntitySchema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true, default: "" },
  body: { type: String, trim: true, default: "" },
  isRead: { type: Boolean, default: false },
  // The employee a notification is addressed to; null is the shared administrator bell.
  recipientEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", default: null },
});

notificationsSchema.index({ isRead: 1, createdAt: -1 });
notificationsSchema.index({ recipientEmployeeId: 1, isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model("notifications", notificationsSchema);
