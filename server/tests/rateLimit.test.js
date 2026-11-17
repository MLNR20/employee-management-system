// Rate limiting: a general cap on the API, a stricter one on credential endpoints that only counts failures.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/presentation/http/app.js";
import { InvalidCredentialsError } from "../src/domain/errors.js";

const servers = [];

// Routers read their use cases when the app is built, so the ones these tests never call are stubs.
const stub = () => new Proxy({}, { get: () => async () => ({}) });

// Only the admin and employee login use cases are exercised; everything else is never called.
const start = async (rateLimits) => {
  const authUseCases = {
    login: async ({ password }) => {
      if (password !== "right") throw new InvalidCredentialsError();
      return { accessToken: "t", refreshToken: "r" };
    },
    ensureAdministratorsExist: async () => ({ created: false }),
  };
  const employeeAuthUseCases = {
    login: async () => {
      throw new InvalidCredentialsError();
    },
  };
  const app = createApp({
    authUseCases,
    employeeAuthUseCases,
    employeeUseCases: stub(),
    departmentUseCases: stub(),
    roleUseCases: stub(),
    roleAssignmentUseCases: stub(),
    leaveTypeUseCases: stub(),
    leaveBalanceUseCases: stub(),
    leaveRequestUseCases: stub(),
    administratorUseCases: stub(),
    inventoryUseCases: stub(),
    dashboardUseCases: stub(),
    borrowingUseCases: stub(),
    rateLimits,
  });
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  return `http://localhost:${server.address().port}`;
};

const post = (base, path, password = "wrong", headers = {}) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ username: "a", password }),
  });

after(() => servers.forEach((server) => server.close()));

test("without rateLimits nothing is limited", async () => {
  const base = await start(undefined);
  for (let i = 0; i < 30; i++) assert.equal((await post(base, "/admin/login")).status, 400);
});

test("the general limit answers 429 with a message and Retry-After once exceeded", async () => {
  const base = await start({ api: { windowMs: 60_000, max: 3 } });

  for (let i = 0; i < 3; i++) assert.equal((await fetch(`${base}/admin`)).status, 200);
  const blocked = await fetch(`${base}/admin`);

  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).message, /too many requests/i);
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
});

test("/health is never limited", async () => {
  const base = await start({ api: { windowMs: 60_000, max: 1 } });

  for (let i = 0; i < 5; i++) assert.equal((await fetch(`${base}/health`)).status, 200);
});

test("failed sign-ins are capped per IP", async () => {
  const base = await start({ auth: { windowMs: 60_000, max: 3 } });

  for (let i = 0; i < 3; i++) assert.equal((await post(base, "/admin/login")).status, 400);
  const blocked = await post(base, "/admin/login");
  assert.equal(blocked.status, 429);
  assert.match((await blocked.json()).message, /too many attempts/i);
});

test("the administrator and employee logins share one allowance, so switching endpoints does not reset it", async () => {
  const base = await start({ auth: { windowMs: 60_000, max: 2 } });

  assert.equal((await post(base, "/admin/login")).status, 400);
  assert.equal((await post(base, "/employee-auth/login")).status, 400);
  assert.equal((await post(base, "/employee-auth/login")).status, 429);
  assert.equal((await post(base, "/admin/login")).status, 429);
});

test("successful sign-ins do not use up the allowance", async () => {
  const base = await start({ auth: { windowMs: 60_000, max: 2 } });

  for (let i = 0; i < 10; i++) assert.equal((await post(base, "/admin/login", "right")).status, 200);
  assert.equal((await post(base, "/admin/login")).status, 400);
});

test("the sign-in limit leaves the rest of the API alone", async () => {
  const base = await start({ auth: { windowMs: 60_000, max: 1 } });

  await post(base, "/admin/login");
  assert.equal((await post(base, "/admin/login")).status, 429);
  assert.equal((await fetch(`${base}/admin`)).status, 200, "GET /admin is not a sign-in attempt");
});

test("with trustProxy each client behind the proxy gets its own count", async () => {
  const base = await start({ auth: { windowMs: 60_000, max: 1 }, trustProxy: 1 });
  const from = (ip) => ({ "X-Forwarded-For": ip });

  await post(base, "/admin/login", "wrong", from("203.0.113.1"));
  assert.equal((await post(base, "/admin/login", "wrong", from("203.0.113.1"))).status, 429);
  assert.equal((await post(base, "/admin/login", "wrong", from("203.0.113.2"))).status, 400);
});
