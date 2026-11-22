/**
 * Pushes a freshly raised notification to everyone who is connected right now.
 * The use cases only know this contract; Socket.IO is one implementation (see infrastructure/realtime).
 */
export class NotificationPublisher {
  /** @param {import("../../domain/notification/Notification").Notification} notification */
  publish(notification) {
    throw new Error("NotificationPublisher.publish not implemented");
  }
}
