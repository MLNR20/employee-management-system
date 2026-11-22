import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";

// createdAt (from the base schema) is the date the notification was created.
const notificationsSchema = createEntitySchema({
  title: { type: String, required: true, trim: true },
  subtitle: { type: String, trim: true, default: "" },
  body: { type: String, trim: true, default: "" },
  isRead: { type: Boolean, default: false },
});

notificationsSchema.index({ isRead: 1, createdAt: -1 });

export const NotificationModel = mongoose.model("notifications", notificationsSchema);
