import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { io as connect } from "socket.io-client";
import { createLeaveRequestUseCases } from "../src/application/leave/leaveRequestUseCases.js";
import { createNotificationUseCases } from "../src/application/notification/notificationUseCases.js";
import { createSocketServer } from "../src/infrastructure/realtime/createSocketServer.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  NOTIFICATION_EVENT,
  SocketIoNotificationPublisher,
} from "../src/infrastructure/realtime/SocketIoNotificationPublisher.js";
import {
  InMemoryAdministratorRepository,
  InMemoryLeaveApprovalRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  InMemoryNotificationRepository,
  createInMemoryEmployeeRepository,
  createInMemoryLeaveTypeRepository,
} from "./fakes.js";

const employee = (extra = {}) => ({ first_name: "Ana", last_name: "Cruz", email: "ana@x.test", position: "Accountant", ...extra });

async function setup({ notificationUseCases } = {}) {
  const employeeRepository = createInMemoryEmployeeRepository();
  const leaveTypeRepository = createInMemoryLeaveTypeRepository();
  const leaveBalanceRepository = new InMemoryLeaveBalanceRepository();
  const leaveApprovalRepository = new InMemoryLeaveApprovalRepository();
  const administratorRepository = new InMemoryAdministratorRepository();
  const notificationRepository = new InMemoryNotificationRepository();
  const notifications = notificationUseCases ?? createNotificationUseCases({ notificationRepository });
  const leave = createLeaveRequestUseCases({
    leaveRequestRepository: new InMemoryLeaveRequestRepository(),
    leaveApprovalRepository,
    leaveBalanceRepository,
    employeeRepository,
    leaveTypeRepository,
    administratorRepository,
    notificationUseCases: notifications,
  });

  const manager = await employeeRepository.create(employee({ first_name: "Mia", last_name: "Boss", email: "mia@x.test" }));
  const report = await employeeRepository.create(employee({ managerId: manager.id }));
  const loner = await employeeRepository.create(employee({ first_name: "Lou", email: "lou@x.test" }));
  const type = await leaveTypeRepository.create({ name: "Vacation Leave", description: "" });
  for (const person of [report, loner]) {
    await leaveBalanceRepository.create({ employeeId: person.id, leaveTypeId: type.id, maxLeaves: 15, availableLeaves: 15 });
  }
  return { leave, notifications, notificationRepository, administratorRepository, manager, report, loner, type };
}

test("filing leave notifies the employee's manager, and only the manager", async () => {
  const { leave, notifications, manager, report, type } = await setup();
  await leave.fileLeave({ employeeId: report.id, leaveTypeId: type.id, startDate: "2026-12-01", endDate: "2026-12-03", reason: "Rest" });

  const forManager = await notifications.listForEmployee(manager.id, {});
  assert.equal(forManager.items.length, 1);
  assert.equal(forManager.items[0].title, "New leave request");
  assert.match(forManager.items[0].subtitle, /Ana Cruz/);
  assert.match(forManager.items[0].body, /3 days of Vacation Leave \(2026-12-01 to 2026-12-03\)/);
  assert.match(forManager.items[0].body, /Rest/);
  assert.equal(await notifications.countUnreadForEmployee(manager.id), 1);

  // Not for the employee who filed it, and not on the shared administrator bell.
  assert.equal((await notifications.listForEmployee(report.id, {})).items.length, 0);
  assert.equal(await notifications.countUnread(), 0);
});

test("an employee without a manager notifies no one", async () => {
  const { leave, notificationRepository, loner, type } = await setup();
  await leave.fileLeave({ employeeId: loner.id, leaveTypeId: type.id, startDate: "2026-12-01", endDate: "2026-12-01" });
  assert.equal((await notificationRepository.findAll()).length, 0);
});

test("a manager can read and mark only their own notifications", async () => {
  const { leave, notifications, manager, report, type } = await setup();
  await leave.fileLeave({ employeeId: report.id, leaveTypeId: type.id, startDate: "2026-12-01", endDate: "2026-12-01" });
  const [mine] = (await notifications.listForEmployee(manager.id, {})).items;

  await assert.rejects(notifications.markReadForEmployee(mine.id, report.id), { name: "NotFoundError" });
  assert.equal(await notifications.countUnreadForEmployee(manager.id), 1);

  assert.equal((await notifications.markReadForEmployee(mine.id, manager.id)).isRead, true);
  assert.equal(await notifications.countUnreadForEmployee(manager.id), 0);
});

test("a failing notification never fails the leave request", async () => {
  const { leave, report, type } = await setup({
    notificationUseCases: {
      createNotification: async () => {
        throw new Error("boom");
      },
    },
  });
  const log = console.error;
  console.error = () => {};
  try {
    const request = await leave.fileLeave({ employeeId: report.id, leaveTypeId: type.id, startDate: "2026-12-01", endDate: "2026-12-01" });
    assert.equal(request.status, "pending");
  } finally {
    console.error = log;
  }
});

test("a decided request carries who decided it", async () => {
  const { leave, administratorRepository, report, type } = await setup();
  const admin = await administratorRepository.create({ username: "hr", first_name: "Hannah", last_name: "Reyes", email: "h@x.test", passwordHash: "x" });
  const filed = await leave.fileLeave({ employeeId: report.id, leaveTypeId: type.id, startDate: "2026-12-01", endDate: "2026-12-02" });

  let [row] = await leave.listForEmployeeWithDecisions(report.id);
  assert.equal(row.decision, null);

  await leave.approveLeave(filed.id, { approverId: admin.id, remarks: "Enjoy" });
  [row] = await leave.listForEmployeeWithDecisions(report.id);
  assert.equal(row.status, "approved");
  assert.equal(row.decision.decision, "approved");
  assert.equal(row.decision.decidedBy, "Hannah Reyes");
  assert.equal(row.decision.remarks, "Enjoy");
  assert.ok(row.decision.decidedAt);
});

// --- Live delivery: each person only receives what is addressed to them -----------------------------

let server;
let io;
let base;
let adminToken;
let employeeToken;
let otherToken;
const sockets = [];
const publisher = new SocketIoNotificationPublisher();

before(async () => {
  const adminTokens = new JwtTokenService({ accessSecret: "a", refreshSecret: "r", accessTtl: "15m", refreshTtl: "7d" });
  const employeeTokens = new JwtTokenService({ accessSecret: "e", refreshSecret: "x", accessTtl: "15m", refreshTtl: "7d" });
  adminToken = adminTokens.signAccessToken({ id: "1", username: "admin", first_name: "A", last_name: "B" });
  employeeToken = employeeTokens.signAccessToken({ id: "emp-1", username: "m@x.test", first_name: "M", last_name: "B" });
  otherToken = employeeTokens.signAccessToken({ id: "emp-2", username: "o@x.test", first_name: "O", last_name: "B" });

  server = http.createServer();
  io = createSocketServer(server, {
    authUseCases: { authenticate: (token) => adminTokens.verifyAccessToken(token) },
    employeeAuthUseCases: { authenticate: (token) => employeeTokens.verifyAccessToken(token) },
  });
  publisher.attach(io);
  await new Promise((resolve) => server.listen(0, resolve));
  base = `http://localhost:${server.address().port}`;
});

after(async () => {
  sockets.forEach((socket) => socket.disconnect());
  await io.close();
});

const open = async (token) => {
  const socket = connect(base, { auth: { token }, transports: ["websocket"], reconnection: false });
  sockets.push(socket);
  const events = [];
  socket.on(NOTIFICATION_EVENT, (event) => events.push(event));
  await new Promise((resolve, reject) => {
    socket.on("connect", resolve);
    socket.on("connect_error", reject);
  });
  return events;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

test("a notification for an employee reaches only that employee's connection", async () => {
  const admin = await open(adminToken);
  const manager = await open(employeeToken);
  const other = await open(otherToken);

  publisher.publish({ id: "n1", title: "New leave request", recipientEmployeeId: "emp-1" });
  await settle();

  assert.deepEqual(manager.map((n) => n.title), ["New leave request"]);
  assert.equal(admin.length, 0);
  assert.equal(other.length, 0);
});

test("a notification without a recipient reaches administrators, not employees", async () => {
  const admin = await open(adminToken);
  const manager = await open(employeeToken);

  publisher.publish({ id: "n2", title: "For admins", recipientEmployeeId: null });
  await settle();

  assert.deepEqual(admin.map((n) => n.title), ["For admins"]);
  assert.equal(manager.length, 0);
});

test("an unknown token cannot connect", async () => {
  await assert.rejects(open("not-a-token"));
});
