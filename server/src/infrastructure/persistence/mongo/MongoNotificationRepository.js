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
  });

export class MongoNotificationRepository extends MongoRepository {
  constructor() {
    super({
      model: NotificationModel,
      toEntity: toNotification,
      searchFields: ["title", "subtitle", "body"],
    });
  }

  countUnread() {
    return this.model.countDocuments({ isRead: false });
  }

  async markAllRead() {
    const { modifiedCount } = await this.model.updateMany({ isRead: false }, { isRead: true });
    return modifiedCount;
  }
}
