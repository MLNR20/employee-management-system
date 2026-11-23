import { Repository } from "../Repository.js";

/** @extends {Repository<import("./Notification").Notification>} */
export class NotificationRepository extends Repository {
  /** One employee's notifications, newest first. @returns {Promise<{items: Array, total: number}>} */
  async findPageForEmployee(employeeId, { page, pageSize }) {
    throw new Error("NotificationRepository.findPageForEmployee not implemented");
  }

  /** @returns {Promise<number>} how many of the employee's notifications are unread */
  async countUnreadForEmployee(employeeId) {
    throw new Error("NotificationRepository.countUnreadForEmployee not implemented");
  }

  /** Marks one of the employee's own notifications read. @returns the notification, or null if it is not theirs */
  async markReadForEmployee(id, employeeId) {
    throw new Error("NotificationRepository.markReadForEmployee not implemented");
  }

  /** @returns {Promise<number>} how many of the employee's notifications were marked read */
  async markAllReadForEmployee(employeeId) {
    throw new Error("NotificationRepository.markAllReadForEmployee not implemented");
  }

  /** @returns {Promise<number>} how many notifications are still unread */
  async countUnread() {
    throw new Error("NotificationRepository.countUnread not implemented");
  }

  /** @returns {Promise<number>} how many notifications were marked read */
  async markAllRead() {
    throw new Error("NotificationRepository.markAllRead not implemented");
  }
}
