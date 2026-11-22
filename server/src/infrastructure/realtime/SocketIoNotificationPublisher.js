import { NotificationPublisher } from "../../application/ports/NotificationPublisher.js";
import { toDto } from "../../presentation/http/routes/crudRouter.js";

export const NOTIFICATION_EVENT = "notification:new";

/**
 * Broadcasts over Socket.IO. It is created before the HTTP server exists (the use cases need it), so the
 * server is attached afterwards; until then, or in tests, publishing quietly does nothing.
 */
export class SocketIoNotificationPublisher extends NotificationPublisher {
  #io = null;

  attach(io) {
    this.#io = io;
  }

  publish(notification) {
    this.#io?.emit(NOTIFICATION_EVENT, toDto(notification));
  }
}
