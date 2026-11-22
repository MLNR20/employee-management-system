import { Repository } from "../Repository.js";

/** @extends {Repository<import("./Notification").Notification>} */
export class NotificationRepository extends Repository {
  /** @returns {Promise<number>} how many notifications are still unread */
  async countUnread() {
    throw new Error("NotificationRepository.countUnread not implemented");
  }

  /** @returns {Promise<number>} how many notifications were marked read */
  async markAllRead() {
    throw new Error("NotificationRepository.markAllRead not implemented");
  }
}
