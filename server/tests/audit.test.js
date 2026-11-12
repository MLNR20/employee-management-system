import { test } from "node:test";
import assert from "node:assert/strict";
import { describeRequest } from "../src/domain/audit/auditRules.js";
import { createAuditLogUseCases } from "../src/application/audit/auditLogUseCases.js";
import { MongoAuditLogRepository } from "../src/infrastructure/persistence/mongo/MongoAuditLogRepository.js";
import { InMemoryAuditLogRepository } from "./fakes.js";

const id = "64b7f0c2a1b2c3d4e5f60718";

test("describeRequest names the action, resource and record", () => {
  assert.deepEqual(describeRequest({ method: "POST", url: "/employees/", status: 200 }), {
    method: "POST", path: "/employees/", resource: "employees", resourceId: undefined, action: "create",
  });
  assert.equal(describeRequest({ method: "PUT", url: `/departments/${id}`, status: 200 }).action, "update");
  assert.equal(describeRequest({ method: "DELETE", url: `/roles/${id}`, status: 200 }).resourceId, id);
  assert.equal(describeRequest({ method: "POST", url: `/leave-requests/${id}/approve`, status: 200 }).action, "approve");
});

test("describeRequest skips reads, failures and token refreshes, but keeps failed logins", () => {
  assert.equal(describeRequest({ method: "GET", url: "/employees/", status: 200 }), null);
  assert.equal(describeRequest({ method: "POST", url: "/employees/", status: 400 }), null);
  assert.equal(describeRequest({ method: "POST", url: "/admin/refresh", status: 200 }), null);
  assert.equal(describeRequest({ method: "POST", url: "/admin/login", status: 200 }).action, "login");
  assert.equal(describeRequest({ method: "POST", url: "/admin/login", status: 400 }).action, "login_failed");
  assert.equal(describeRequest({ method: "POST", url: "/admin/logout", status: 204 }).action, "logout");
});

test("describeRequest drops the query string from the recorded path", () => {
  assert.equal(describeRequest({ method: "DELETE", url: `/roles/${id}?x=secret`, status: 200 }).path, `/roles/${id}`);
});

test("record keeps only known fields", async () => {
  const useCases = createAuditLogUseCases({ auditLogRepository: new InMemoryAuditLogRepository() });
  const entry = await useCases.record({ action: "create", resource: "employees", password: "leak", body: { a: 1 } });
  assert.equal(entry.action, "create");
  assert.equal(entry.password, undefined);
  assert.equal(entry.body, undefined);
});

test("the audit log repository refuses to change or erase entries", async () => {
  const repository = new MongoAuditLogRepository();
  await assert.rejects(() => repository.update("x", {}), /append-only/);
  await assert.rejects(() => repository.remove("x"), /append-only/);
});
