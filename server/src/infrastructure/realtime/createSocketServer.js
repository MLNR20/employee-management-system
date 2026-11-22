import { Server } from "socket.io";

/**
 * Attaches Socket.IO to the HTTP server. Only signed-in administrators may connect: the client sends its
 * access token in the handshake and it is checked the same way as an HTTP request's bearer token.
 *
 * @param {import("http").Server} httpServer
 * @param {{authUseCases: {authenticate: (token: string) => object}, corsOrigins?: string[]}} options
 */
export const createSocketServer = (httpServer, { authUseCases, corsOrigins = [] }) => {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins.length > 0 ? corsOrigins : "*" },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error("Token missing"));
      socket.data.user = authUseCases.authenticate(token);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  return io;
};
