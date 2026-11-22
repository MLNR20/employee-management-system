import { HttpRepository } from "../http/HttpRepository";
import { Notification } from "../../domain/notification/Notification";

/** The bell's notifications: the generic paged list plus the unread count and the mark-as-read calls. */
export class HttpNotificationRepository extends HttpRepository {
  constructor() {
    super({ resource: "notifications", fromApi: Notification.fromApi });
  }

  async getUnreadCount() {
    const { data } = await this.client.get("/notifications/unread-count");
    return data.count;
  }

  async markAsRead(id) {
    const { data } = await this.client.patch(`/notifications/${id}/read`);
    return Notification.fromApi(data);
  }

  async markAllAsRead() {
    await this.client.post("/notifications/read-all");
  }
}
