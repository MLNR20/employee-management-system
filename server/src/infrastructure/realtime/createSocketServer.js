import { Server } from "socket.io";
import { ADMIN_ROOM, employeeRoom } from "./SocketIoNotificationPublisher.js";

/**
 * Attaches Socket.IO to the HTTP server. Only signed-in people may connect: the client sends its access token
 * in the handshake and it is checked the same way as an HTTP request's bearer token. An administrator's token
 * joins the shared administrator room; with `employeeAuthUseCases`, an employee's token (signed with the
 * employee secret) joins that employee's own room, so each person only receives what is addressed to them.
 *
 * @param {import("http").Server} httpServer
 * @param {{authUseCases: {authenticate: (token: string) => object}, employeeAuthUseCases?: {authenticate: (token: string) => object}, corsOrigins?: string[]}} options
 */
export const createSocketServer = (httpServer, { authUseCases, employeeAuthUseCases, corsOrigins = [] }) => {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins.length > 0 ? corsOrigins : "*" },
  });

  const identify = (token) => {
    try {
      return { room: ADMIN_ROOM, user: authUseCases.authenticate(token) };
    } catch (adminError) {
      if (!employeeAuthUseCases) throw adminError;
      const user = employeeAuthUseCases.authenticate(token);
      return { room: employeeRoom(user.id), user };
    }
  };

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token missing"));
      const { room, user } = identify(token);
      socket.data.user = user;
      socket.data.room = room;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => socket.join(socket.data.room));

  return io;
};
