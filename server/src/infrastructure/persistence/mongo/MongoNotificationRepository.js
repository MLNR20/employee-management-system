import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Notification } from "../../../domain/notification/Notification.js";
import { NotificationModel } from "./models/notificationModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toNotification = (doc) =>
  new Notification({
    ...toBaseProps(doc),
    title: doc.title,
    subtitle: doc.subtitle,
    body: doc.body,
    isRead: doc.isRead,
    recipientEmployeeId: doc.recipientEmployeeId ? String(doc.recipientEmployeeId) : null,
  });

// The generic reads, counts and updates below are the administrators' bell: notifications addressed to an
// employee never appear there (recipientEmployeeId: null also matches documents saved before the field existed).
const ADMIN_ONLY = { recipientEmployeeId: null };

export class MongoNotificationRepository extends MongoRepository {
  constructor() {
    super({
      model: NotificationModel,
      toEntity: toNotification,
      searchFields: ["title", "subtitle", "body"],
      baseFilter: ADMIN_ONLY,
    });
  }

  countUnread() {
    return this.model.countDocuments({ ...ADMIN_ONLY, isRead: false });
  }

  async markAllRead() {
    const { modifiedCount } = await this.model.updateMany({ ...ADMIN_ONLY, isRead: false }, { isRead: true });
    return modifiedCount;
  }

  async findPageForEmployee(employeeId, { page, pageSize }) {
    if (!mongoose.isValidObjectId(employeeId)) return { items: [], total: 0 };
    const filter = { recipientEmployeeId: employeeId };
    const [docs, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1, _id: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: docs.map(toNotification), total };
  }

  countUnreadForEmployee(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return 0;
    return this.model.countDocuments({ recipientEmployeeId: employeeId, isRead: false });
  }

  async markReadForEmployee(id, employeeId) {
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(employeeId)) return null;
    const doc = await this.model
      .findOneAndUpdate({ _id: id, recipientEmployeeId: employeeId }, { isRead: true }, { new: true })
      .lean();
    return doc ? toNotification(doc) : null;
  }

  async markAllReadForEmployee(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return 0;
    const { modifiedCount } = await this.model.updateMany({ recipientEmployeeId: employeeId, isRead: false }, { isRead: true });
    return modifiedCount;
  }
}
