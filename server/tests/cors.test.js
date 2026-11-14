// CORS: with allowed origins only those sites get through; with none, development stays open.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createCorsMiddleware } from "../src/presentation/http/middleware/corsMiddleware.js";

const servers = [];

const start = async (allowedOrigins) => {
  const app = express();
  app.use(createCorsMiddleware(allowedOrigins));
  app.get("/ping", (req, res) => res.json({ ok: true }));
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  servers.push(server);
  return `http://localhost:${server.address().port}`;
};

const allowOriginHeader = async (base, origin) => {
  const response = await fetch(`${base}/ping`, { headers: origin ? { Origin: origin } : {} });
  assert.equal(response.status, 200);
  return response.headers.get("access-control-allow-origin");
};

let restricted;
let open;

before(async () => {
  restricted = await start(["https://hr.example.com", "http://localhost:3000"]);
  open = await start([]);
});

after(() => servers.forEach((server) => server.close()));

test("a listed origin is allowed and any other site gets no CORS permission", async () => {
  assert.equal(await allowOriginHeader(restricted, "https://hr.example.com"), "https://hr.example.com");
  assert.equal(await allowOriginHeader(restricted, "http://localhost:3000"), "http://localhost:3000");
  assert.equal(await allowOriginHeader(restricted, "https://evil.example.org"), null);
  assert.equal(await allowOriginHeader(restricted, "https://hr.example.com.evil.org"), null, "no prefix matching");
});

test("requests without an Origin header (curl, other servers) still work", async () => {
  assert.equal((await fetch(`${restricted}/ping`)).status, 200);
});

test("the browser preflight is answered for a listed origin only", async () => {
  const preflight = (origin) =>
    fetch(`${restricted}/ping`, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization,content-type" },
    });

  const allowed = await preflight("https://hr.example.com");
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://hr.example.com");
  assert.equal((await preflight("https://evil.example.org")).headers.get("access-control-allow-origin"), null);
});

test("with no list configured every origin is allowed, as in local development", async () => {
  assert.equal(await allowOriginHeader(open, "https://anything.example.net"), "*");
});
