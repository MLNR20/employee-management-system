import { normalizePageQuery, toPage } from "../../domain/pagination.js";
import { NotFoundError, ValidationError } from "../../domain/errors.js";

/**
 * Raising and reading the notifications behind the navbar bell.
 *
 * @param {Object} deps
 * @param {import("../../domain/notification/NotificationRepository").NotificationRepository} deps.notificationRepository
 * @param {import("../ports/NotificationPublisher").NotificationPublisher} [deps.notificationPublisher] optional: told about each new notification so connected clients see it at once
 */
export const createNotificationUseCases = ({ notificationRepository, notificationPublisher }) => ({
  /**
   * Raises a new, unread notification and pushes it to connected clients. With `recipientEmployeeId` it is
   * addressed to that employee's portal bell; without, it goes to the shared administrator bell.
   */
  async createNotification({ title, subtitle, body, recipientEmployeeId = null } = {}) {
    if (typeof title !== "string" || !title.trim()) throw new ValidationError("Title is required");
    const notification = await notificationRepository.create({
      title,
      subtitle,
      body,
      isRead: false,
      recipientEmployeeId,
    });
    // The notification is already saved; a failed push must not turn that into an error for the caller.
    try {
      notificationPublisher?.publish(notification);
    } catch (error) {
      console.error("Could not publish notification", error);
    }
    return notification;
  },

  async listNotificationsPage(query) {
    const request = normalizePageQuery(query);
    return toPage(await notificationRepository.findPage({ ...request, sortDir: -1 }), request);
  },

  /** One employee's own notifications, newest first. */
  async listForEmployee(employeeId, query) {
    const request = normalizePageQuery(query);
    return toPage(await notificationRepository.findPageForEmployee(employeeId, request), request);
  },

  countUnreadForEmployee: (employeeId) => notificationRepository.countUnreadForEmployee(employeeId),

  /** Someone else's notification is reported as not found, like other portal records. */
  async markReadForEmployee(id, employeeId) {
    const notification = await notificationRepository.markReadForEmployee(id, employeeId);
    if (!notification) throw new NotFoundError("Notification not found");
    return notification;
  },

  markAllReadForEmployee: (employeeId) => notificationRepository.markAllReadForEmployee(employeeId),

  countUnread() {
    return notificationRepository.countUnread();
  },

  async markAsRead(id) {
    const notification = await notificationRepository.update(id, { isRead: true });
    if (!notification) throw new NotFoundError("Notification not found");
    return notification;
  },

  markAllAsRead() {
    return notificationRepository.markAllRead();
  },
});
