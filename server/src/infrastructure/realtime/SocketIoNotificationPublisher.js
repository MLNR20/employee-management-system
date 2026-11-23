import { NotificationPublisher } from "../../application/ports/NotificationPublisher.js";
import { toDto } from "../../presentation/http/routes/crudRouter.js";

export const NOTIFICATION_EVENT = "notification:new";

/** The Socket.IO rooms a connection joins: every administrator is in one, each employee in their own. */
export const ADMIN_ROOM = "admins";
export const employeeRoom = (employeeId) => `employee:${employeeId}`;

/**
 * Pushes over Socket.IO to the right room. It is created before the HTTP server exists (the use cases need it), so the
 * server is attached afterwards; until then, or in tests, publishing quietly does nothing.
 */
export class SocketIoNotificationPublisher extends NotificationPublisher {
  #io = null;

  attach(io) {
    this.#io = io;
  }

  /** A notification for an employee goes only to that employee's connections; the rest go to administrators. */
  publish(notification) {
    const room = notification.recipientEmployeeId ? employeeRoom(notification.recipientEmployeeId) : ADMIN_ROOM;
    this.#io?.to(room).emit(NOTIFICATION_EVENT, toDto(notification));
  }
}
