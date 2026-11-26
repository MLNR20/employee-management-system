// Offboarding: the rehireable / non-rehireable tag, its two steps (start, complete), the offboarding
// document checklist, rehiring, and the rules that stop the tag being bypassed.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/presentation/http/app.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import { createEmployeeAuthUseCases } from "../src/application/employee/employeeAuthUseCases.js";
import { createOffboardingUseCases } from "../src/application/employee/offboardingUseCases.js";
import {
  createDocumentRequirementUseCases,
  createEmployeeDocumentUseCases,
} from "../src/application/document/documentUseCases.js";
import { DEFAULT_REQUIREMENTS } from "../src/domain/document/defaultRequirements.js";
import {
  InMemoryDocumentRequirementRepository,
  InMemoryEmployeeDocumentRepository,
  InMemoryInventoryRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const ADMIN = "000000000000000000000a01";
const TODAY = "2026-03-02";

let server;
let base;
let employeeRepository;
let itemRepository;
let leaveRequestRepository;
let documentRequirementRepository;
let employeeDocumentRepository;
let requirementUseCases;

before(async () => {
  employeeRepository = createInMemoryEmployeeRepository();
  itemRepository = new InMemoryInventoryRepository();
  leaveRequestRepository = new InMemoryLeaveRequestRepository();
  documentRequirementRepository = new InMemoryDocumentRequirementRepository();
  employeeDocumentRepository = new InMemoryEmployeeDocumentRepository();
  const passwordHasher = { hash: async (p) => `hash:${p}`, compare: async (p, h) => h === `hash:${p}` };
  // The token is just the employee id, so the portal can be called as anyone.
  const tokenService = { signAccessToken: (e) => e.id, verifyAccessToken: (token) => ({ id: token }) };

  requirementUseCases = createDocumentRequirementUseCases({ documentRequirementRepository, employeeDocumentRepository });
  const employeeDocumentUseCases = createEmployeeDocumentUseCases({
    employeeDocumentRepository,
    documentRequirementRepository,
    employeeRepository,
    utcOffsetMinutes: 480,
    now: () => new Date(`${TODAY}T04:00:00Z`),
  });

  // Route groups these tests never call still have to be handed something.
  const unused = () => new Proxy({}, { get: () => () => {} });

  const app = createApp({
    ...Object.fromEntries(
      [
        "departmentUseCases",
        "roleUseCases",
        "roleAssignmentUseCases",
        "leaveTypeUseCases",
        "leaveBalanceUseCases",
        "leaveRequestUseCases",
        "administratorUseCases",
        "inventoryUseCases",
        "dashboardUseCases",
      ].map((name) => [name, unused()])
    ),
    authUseCases: { authenticate: () => ({ id: ADMIN }) },
    employeeAuthUseCases: createEmployeeAuthUseCases({ employeeRepository, passwordHasher, tokenService }),
    employeeUseCases: createEmployeeUseCases({
      employeeRepository,
      leaveBalanceRepository: new InMemoryLeaveBalanceRepository(),
      leaveRequestRepository,
      itemRepository,
      passwordHasher,
    }),
    documentRequirementUseCases: requirementUseCases,
    employeeDocumentUseCases,
    offboardingUseCases: createOffboardingUseCases({
      employeeRepository,
      employeeDocumentUseCases,
      itemRepository,
      leaveRequestRepository,
      utcOffsetMinutes: 480,
      now: () => new Date(`${TODAY}T04:00:00Z`),
    }),
  });
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, body, token = "admin-token") => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

let sequence = 0;
const form = (overrides = {}) => {
  sequence++;
  return {
    first_name: "Ann",
    last_name: "Lee",
    email: `person${sequence}@example.com`,
    position: "Accountant",
    department: "Finance and Accounting",
    salary: "5000",
    ...overrides,
  };
};
const hire = async (overrides) => (await call("POST", "/employees/", form(overrides))).body;
const leaving = (overrides = {}) => ({ separationType: "resignation", lastWorkingDay: TODAY, ...overrides });
const get = async (id) => (await call("GET", `/employees/${id}`)).body;
const offboard = async (id, rehireStatus, extra = {}) => {
  assert.equal((await call("POST", `/offboarding/${id}`, leaving(extra))).status, 200);
  return call("POST", `/offboarding/${id}/complete`, { rehireStatus, rehireNotes: "Policy breach" });
};

test("both checklists are created, and an existing onboarding-only install gains the offboarding one", async () => {
  // A requirement saved before stages existed counts as onboarding.
  const legacy = await documentRequirementRepository.create({ name: "Old contract" });
  assert.equal(legacy.stage, "onboarding");

  const offboardingDefaults = DEFAULT_REQUIREMENTS.filter((r) => r.stage === "offboarding");
  assert.ok(offboardingDefaults.length >= 5);

  assert.equal((await requirementUseCases.ensureDefaultRequirements()).created, offboardingDefaults.length);
  assert.equal((await requirementUseCases.ensureDefaultRequirements()).created, 0);

  const employee = await hire();
  const onboarding = (await call("GET", `/employee-documents/checklist/${employee._id}`)).body;
  const offboarding = (await call("GET", `/employee-documents/checklist/${employee._id}?stage=offboarding`)).body;
  assert.equal(onboarding.stage, "onboarding");
  assert.deepEqual(onboarding.data.map((i) => i.requirement.name), ["Old contract"]);
  assert.equal(offboarding.data.length, offboardingDefaults.length);
  assert.equal((await call("GET", `/employee-documents/checklist/${employee._id}?stage=other`)).status, 400);
  assert.equal((await call("POST", "/document-requirements/", { name: "X", stage: "other" })).status, 400);
});

test("an employee only leaves through offboarding, so nobody leaves untagged", async () => {
  const employee = await hire();
  assert.equal(employee.rehireStatus, "");
  assert.equal(employee.separation, null);

  const viaForm = await call("PUT", `/employees/${employee._id}`, form({ email: employee.email, status: "false" }));
  assert.equal(viaForm.status, 409);
  assert.match(viaForm.body.message, /Offboard/);
  assert.equal((await call("PUT", `/employees/${employee._id}`, form({ email: employee.email, isActive: "no" }))).status, 400);
  assert.equal((await get(employee._id)).isActive, true);

  // The tag and the offboarding cannot be written through the employee form.
  await call("PUT", `/employees/${employee._id}`, form({ email: employee.email, rehireStatus: "rehireable", separation: {} }));
  assert.equal((await get(employee._id)).rehireStatus, "");
  assert.equal((await get(employee._id)).separation, null);
});

test("starting needs valid details, and a non-rehireable tag needs a reason", async () => {
  const { _id } = await hire();
  const start = (body) => call("POST", `/offboarding/${_id}`, body);

  assert.equal((await start({})).status, 400);
  assert.equal((await start(leaving({ separationType: "vanished" }))).status, 400);
  assert.equal((await start(leaving({ lastWorkingDay: "2026-02-31" }))).status, 400);
  assert.equal((await start(leaving({ rehireStatus: "maybe" }))).status, 400);
  assert.equal((await start(leaving({ rehireStatus: "non_rehireable" }))).status, 400);
  assert.equal((await call("POST", "/offboarding/000000000000000000000fff", leaving())).status, 404);

  const started = await start(leaving({ reason: "  Moving abroad ", startedBy: "forged", status: "completed" }));
  assert.equal(started.status, 200);
  assert.equal(started.body.separation.status, "in_progress");
  assert.equal(started.body.separation.reason, "Moving abroad");
  assert.equal(started.body.separation.startedBy, ADMIN);
  assert.equal(started.body.isActive, true, "still employed during the notice period");
  assert.equal(started.body.rehireStatus, "");
  assert.equal((await start(leaving())).status, 409, "only one at a time");
});

test("completing needs a tag, the last working day to have come and no direct reports", async () => {
  const boss = await hire();
  const report = await hire({ managerId: boss._id });
  await call("POST", `/offboarding/${boss._id}`, leaving({ lastWorkingDay: "2026-03-31" }));
  const complete = (body) => call("POST", `/offboarding/${boss._id}/complete`, body);

  const untagged = await complete({});
  assert.equal(untagged.status, 409);
  assert.match(untagged.body.message, /rehireable or non-rehireable/);

  const early = await complete({ rehireStatus: "rehireable" });
  assert.equal(early.status, 409);
  assert.match(early.body.message, /2026-03-31/);

  await call("PUT", `/offboarding/${boss._id}`, { lastWorkingDay: TODAY });
  const managing = await complete({ rehireStatus: "rehireable" });
  assert.equal(managing.status, 409);
  assert.match(managing.body.message, /another manager/);

  await call("PUT", `/employees/${report._id}`, form({ email: report.email, managerId: "" }));
  const done = await complete({ rehireStatus: "rehireable" });
  assert.equal(done.status, 200);
  assert.equal(done.body.separation.status, "completed");
  assert.equal(done.body.separation.completedBy, ADMIN);
  assert.equal(done.body.rehireStatus, "rehireable");
  assert.equal(done.body.isActive, false);
  assert.equal((await complete({})).status, 409, "already completed");

  // The tag may be changed afterwards, but never removed.
  assert.equal((await call("PUT", `/offboarding/${boss._id}`, { rehireStatus: "" })).status, 409);
  assert.equal((await call("PUT", `/offboarding/${boss._id}`, { lastWorkingDay: "2027-01-01" })).status, 409);
  assert.equal((await call("PUT", `/offboarding/${boss._id}`, { rehireStatus: "non_rehireable" })).status, 400);
  const retagged = await call("PUT", `/offboarding/${boss._id}`, { rehireStatus: "non_rehireable", rehireNotes: "Fraud found" });
  assert.equal(retagged.status, 200);
  assert.equal(retagged.body.rehireStatus, "non_rehireable");
});

test("the offboarding checklist opens when offboarding starts and stays open after the employee leaves", async () => {
  const { _id } = await hire();
  const checklist = async () => (await call("GET", `/employee-documents/checklist/${_id}?stage=offboarding`)).body;
  const first = (await checklist()).data[0].requirement;
  const record = () => call("POST", "/employee-documents/", { employeeId: _id, requirementId: first._id });

  assert.equal((await record()).status, 409, "not being offboarded");
  await offboard(_id, "rehireable");
  const recorded = await record();
  assert.equal(recorded.status, 200, "collected after they left");
  assert.equal((await call("POST", `/employee-documents/${recorded.body._id}/verify`)).status, 200);
  assert.equal((await checklist()).summary.requiredVerified, 1);

  // A requirement in use cannot be moved to the other checklist.
  assert.equal((await call("PUT", `/document-requirements/${first._id}`, { stage: "onboarding" })).status, 409);
});

test("clearance reports what is outstanding and is met once everything is in", async () => {
  const { _id } = await hire();
  const item = await itemRepository.create({ name: "Laptop", serialNumber: "L-1", status: "in_use", assignedEmployeeId: _id });
  const leave = await leaveRequestRepository.create({ employeeId: _id, status: "pending" });
  await call("POST", `/offboarding/${_id}`, leaving());
  const clearance = async () => (await call("GET", `/offboarding/${_id}`)).body.clearance;

  const before = await clearance();
  assert.deepEqual(before.heldItems, [{ _id: item.id, name: "Laptop", serialNumber: "L-1" }]);
  assert.equal(before.pendingLeave, 1);
  assert.equal(before.documents.requiredVerified, 0);
  assert.equal(before.cleared, false);

  await itemRepository.update(item.id, { status: "available", assignedEmployeeId: null });
  await leaveRequestRepository.update(leave.id, { status: "cancelled" });
  const { data } = (await call("GET", `/employee-documents/checklist/${_id}?stage=offboarding`)).body;
  for (const { requirement } of data.filter((i) => i.requirement.isRequired)) {
    const added = await call("POST", "/employee-documents/", { employeeId: _id, requirementId: requirement._id });
    await call("POST", `/employee-documents/${added.body._id}/verify`);
  }
  assert.equal((await clearance()).cleared, true);
});

test("cancelling withdraws an offboarding in progress and its documents, but not a completed one", async () => {
  const { _id } = await hire();
  await call("POST", `/offboarding/${_id}`, leaving({ rehireStatus: "rehireable" }));
  const { data } = (await call("GET", `/employee-documents/checklist/${_id}?stage=offboarding`)).body;
  await call("POST", "/employee-documents/", { employeeId: _id, requirementId: data[0].requirement._id });

  const cancelled = await call("DELETE", `/offboarding/${_id}`);
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.body.separation, null);
  assert.equal(cancelled.body.rehireStatus, "");
  assert.equal(cancelled.body.isActive, true);
  assert.equal((await employeeDocumentRepository.findByEmployeeId(_id)).length, 0);
  assert.equal((await call("DELETE", `/offboarding/${_id}`)).status, 409, "nothing to cancel");

  await offboard(_id, "rehireable");
  assert.equal((await call("DELETE", `/offboarding/${_id}`)).status, 409);
});

test("a rehireable employee can be rehired, keeping the history and starting a fresh checklist", async () => {
  const employee = await hire();
  const id = employee._id;
  assert.equal((await call("POST", `/offboarding/${id}/rehire`)).status, 409);
  await offboard(id, "rehireable");
  const { data } = (await call("GET", `/employee-documents/checklist/${id}?stage=offboarding`)).body;
  await call("POST", "/employee-documents/", { employeeId: id, requirementId: data[0].requirement._id });

  const viaForm = await call("PUT", `/employees/${id}`, form({ email: employee.email, status: "true" }));
  assert.equal(viaForm.status, 409);
  assert.match(viaForm.body.message, /Rehire/);

  const rehired = await call("POST", `/offboarding/${id}/rehire`);
  assert.equal(rehired.status, 200);
  assert.equal(rehired.body.isActive, true);
  assert.equal(rehired.body.separation, null);
  assert.equal(rehired.body.rehireStatus, "");
  assert.equal(rehired.body.history.length, 1);
  assert.equal(rehired.body.history[0].rehireStatus, "rehireable");
  assert.equal(rehired.body.history[0].rehiredBy, ADMIN);
  assert.equal(rehired.body.history[0].documents[0].requirement, data[0].requirement.name);
  assert.equal((await employeeDocumentRepository.findByEmployeeId(id)).length, 0);

  assert.equal((await call("DELETE", `/employees/${id}`)).status, 409, "the history is kept");
});

test("a non-rehireable employee cannot be rehired, deleted or added again", async () => {
  const employee = await hire({ sssNumber: "34-1234567-8" });
  await offboard(employee._id, "non_rehireable");

  const rehire = await call("POST", `/offboarding/${employee._id}/rehire`);
  assert.equal(rehire.status, 409);
  assert.match(rehire.body.message, /non-rehireable/);
  assert.equal((await call("PUT", `/employees/${employee._id}`, form({ email: employee.email, status: "true" }))).status, 409);
  assert.equal((await call("DELETE", `/employees/${employee._id}`)).status, 409);

  // Not as a "new" person with another email either, nor by editing the number onto another record.
  const again = await call("POST", "/employees/", form({ sssNumber: "3412345678" }));
  assert.equal(again.status, 409);
  assert.match(again.body.message, /non-rehireable/);
  const other = await hire();
  assert.equal((await call("PUT", `/employees/${other._id}`, form({ email: other.email, sssNumber: "34-1234567-8" }))).status, 409);

  // Their own record can still be corrected.
  const edit = form({ email: employee.email, status: "false", sssNumber: "34-1234567-8", position: "Analyst" });
  assert.equal((await call("PUT", `/employees/${employee._id}`, edit)).status, 200);
});

test("an employee who was already inactive can be tagged", async () => {
  const employee = await hire({ status: "false" });
  assert.equal(employee.rehireStatus, "");
  const done = await offboard(employee._id, "non_rehireable", { lastWorkingDay: "2025-01-15" });
  assert.equal(done.status, 200);
  assert.equal(done.body.rehireStatus, "non_rehireable");
});

test("an offboarded employee loses portal access even with a token issued earlier", async () => {
  const { _id } = await hire();
  assert.equal((await call("GET", "/employee-portal/me", null, _id)).status, 200);
  await offboard(_id, "rehireable");
  assert.equal((await call("GET", "/employee-portal/me", null, _id)).status, 401);
});

test("offboarding needs a signed-in administrator", async () => {
  const response = await fetch(`${base}/offboarding/000000000000000000000001`);
  assert.equal(response.status, 401);
});
