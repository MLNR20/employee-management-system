import { io } from "socket.io-client";
import { API_BASE_URL } from "../config/env";
import { tokenStorage } from "../storage/tokenStorage";
import { Notification } from "../../domain/notification/Notification";

/**
 * Listens for notifications the server pushes over Socket.IO.
 *
 * @param {Object} handlers
 * @param {(notification: Notification) => void} handlers.onNew called for each notification raised while connected
 * @param {() => string|null} [handlers.getToken] where to read the token (default: the administrator's); the
 *   employee portal passes the employee token
 * @param {() => void} [handlers.onConnect] called on every (re)connection; anything raised while the connection
 *   was down was never pushed, so this is the moment to reload from the API
 * @returns {() => void} stops listening and closes the connection
 */
export function subscribeToNotifications({ onNew, onConnect, getToken = () => tokenStorage.getAccessToken() }) {
  const socket = io(API_BASE_URL, {
    // A function, so a reconnect sends the token as it is now, after any refresh.
    auth: (send) => send({ token: getToken() }),
  });

  socket.on("notification:new", (raw) => onNew(Notification.fromApi(raw)));
  if (onConnect) socket.on("connect", onConnect);

  return () => socket.disconnect();
}
