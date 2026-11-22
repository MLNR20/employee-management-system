import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { io as connect } from "socket.io-client";
import express from "express";
import { createNotificationRouter } from "../src/presentation/http/routes/notificationRoutes.js";
import { createAuthMiddleware } from "../src/presentation/http/middleware/authMiddleware.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { createNotificationUseCases } from "../src/application/notification/notificationUseCases.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import { createSocketServer } from "../src/infrastructure/realtime/createSocketServer.js";
import {
  NOTIFICATION_EVENT,
  SocketIoNotificationPublisher,
} from "../src/infrastructure/realtime/SocketIoNotificationPublisher.js";
import { InMemoryAdministratorRepository, InMemoryNotificationRepository } from "./fakes.js";

let server;
let io;
let base;
let token;
const sockets = [];

before(async () => {
  const tokenService = new JwtTokenService({ accessSecret: "a", refreshSecret: "r", accessTtl: "15m", refreshTtl: "7d" });
  const authUseCases = createAuthUseCases({
    administratorRepository: new InMemoryAdministratorRepository(),
    passwordHasher: new BcryptPasswordHasher(4),
    tokenService,
  });
  token = tokenService.signAccessToken({ id: "1", username: "admin", first_name: "A", last_name: "B" });

  const publisher = new SocketIoNotificationPublisher();
  const notificationUseCases = createNotificationUseCases({
    notificationRepository: new InMemoryNotificationRepository(),
    notificationPublisher: publisher,
  });
  // Only the notification routes: the full app needs every other use case wired up.
  const app = express();
  app.use(express.json());
  app.use("/notifications", createNotificationRouter({ notificationUseCases, requireAuth: createAuthMiddleware(authUseCases) }));
  app.use(errorHandler);
  server = http.createServer(app);
  io = createSocketServer(server, { authUseCases });
  publisher.attach(io);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  await io.close(); // also closes the HTTP server
});

const api = (path, { method = "GET", body, auth = true } = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

const connectSocket = (auth) => {
  const socket = connect(base, { auth, transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  return socket;
};

test("a notification starts unread and needs a title", async () => {
  const bad = await api("/notifications", { method: "POST", body: { subtitle: "no title" } });
  assert.equal(bad.status, 400);

  const res = await api("/notifications", { method: "POST", body: { title: "Leave filed", subtitle: "Ana", body: "3 days" } });
  assert.equal(res.status, 201);
  const created = await res.json();
  assert.equal(created.title, "Leave filed");
  assert.equal(created.isRead, false);
  assert.ok(created.dateCreated);
  assert.ok(created._id);
});

test("the notification routes need a signed-in administrator", async () => {
  assert.equal((await api("/notifications", { auth: false })).status, 401);
  assert.equal((await api("/notifications/unread-count", { auth: false })).status, 401);
});

test("unread count, mark as read and mark all as read", async () => {
  const count = async () => (await (await api("/notifications/unread-count")).json()).count;
  const unreadBefore = await count();
  const first = await (await api("/notifications", { method: "POST", body: { title: "One" } })).json();
  await api("/notifications", { method: "POST", body: { title: "Two" } });
  assert.equal(await count(), unreadBefore + 2);

  const read = await (await api(`/notifications/${first._id}/read`, { method: "PATCH" })).json();
  assert.equal(read.isRead, true);
  assert.equal(await count(), unreadBefore + 1);

  assert.equal((await api("/notifications/missing/read", { method: "PATCH" })).status, 404);

  await api("/notifications/read-all", { method: "POST" });
  assert.equal(await count(), 0);

  const list = await (await api("/notifications?page=1&pageSize=5")).json();
  assert.ok(list.data.length > 0);
  assert.equal(list.page, 1);
});

test("a connected administrator is pushed each new notification", async () => {
  const socket = connectSocket({ token });
  const received = new Promise((resolve) => socket.on(NOTIFICATION_EVENT, resolve));
  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
  });

  await api("/notifications", { method: "POST", body: { title: "Live one" } });
  const pushed = await received;
  assert.equal(pushed.title, "Live one");
  assert.equal(pushed.isRead, false);
  assert.ok(pushed._id);
});

test("a socket without a valid token is refused", async () => {
  for (const auth of [{}, { token: "garbage" }]) {
    const socket = connectSocket(auth);
    const error = await new Promise((resolve) => socket.on("connect_error", resolve));
    assert.match(error.message, /token/i);
  }
});

test("a failing publisher does not fail the notification", async () => {
  const useCases = createNotificationUseCases({
    notificationRepository: new InMemoryNotificationRepository(),
    notificationPublisher: {
      publish() {
        throw new Error("socket down");
      },
    },
  });
  const original = console.error;
  console.error = () => {};
  try {
    const created = await useCases.createNotification({ title: "Still saved" });
    assert.equal(created.title, "Still saved");
  } finally {
    console.error = original;
  }
});
