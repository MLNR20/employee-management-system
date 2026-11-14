// The onboarding document checklist: requirements (the checklist lines), what each employee handed in,
// HR's verify / reject review, and the per-employee checklist with its summary.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import {
  createDocumentRequirementUseCases,
  createEmployeeDocumentUseCases,
} from "../src/application/document/documentUseCases.js";
import { createDocumentRequirementRouter, createEmployeeDocumentRouter } from "../src/presentation/http/routes/documentRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { DEFAULT_REQUIREMENTS } from "../src/domain/document/defaultRequirements.js";
import {
  InMemoryDocumentRequirementRepository,
  InMemoryEmployeeDocumentRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const REVIEWER = "000000000000000000000c01";
let server;
let base;
let employee;
let inactiveEmployee;
let requirementUseCases;
let documentRequirementRepository;
let today = new Date("2026-03-02T04:00:00.000Z");

before(async () => {
  documentRequirementRepository = new InMemoryDocumentRequirementRepository();
  const employeeDocumentRepository = new InMemoryEmployeeDocumentRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com" });
  inactiveEmployee = await employeeRepository.create({ first_name: "Old", last_name: "Hand", email: "old@example.com", isActive: false });

  requirementUseCases = createDocumentRequirementUseCases({ documentRequirementRepository, employeeDocumentRepository });
  const employeeDocumentUseCases = createEmployeeDocumentUseCases({
    employeeDocumentRepository,
    documentRequirementRepository,
    employeeRepository,
    utcOffsetMinutes: 480,
    now: () => today,
  });

  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    req.user = { id: REVIEWER };
    next();
  };
  app.use("/document-requirements", createDocumentRequirementRouter({ documentRequirementUseCases: requirementUseCases, requireAuth }));
  app.use("/employee-documents", createEmployeeDocumentRouter({ employeeDocumentUseCases, requireAuth }));
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, body) => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

const addRequirement = async (body) => (await call("POST", "/document-requirements/", body)).body;

test("a fresh install gets the standard checklist, once", async () => {
  const first = await requirementUseCases.ensureDefaultRequirements();
  assert.equal(first.created, DEFAULT_REQUIREMENTS.length);
  assert.ok(DEFAULT_REQUIREMENTS.length >= 10);

  const names = DEFAULT_REQUIREMENTS.map((r) => r.name.toLowerCase());
  assert.equal(new Set(names).size, names.length, "default names are unique");
  assert.ok(DEFAULT_REQUIREMENTS.some((r) => r.isRequired === false), "includes an optional line");

  assert.equal((await requirementUseCases.ensureDefaultRequirements()).created, 0, "second run adds nothing");
  assert.equal((await call("GET", "/document-requirements/")).body.count, DEFAULT_REQUIREMENTS.length);

  // Start the rest of the tests from an empty checklist.
  for (const requirement of await documentRequirementRepository.findAll()) await documentRequirementRepository.remove(requirement.id);
});

test("requirements: CRUD, unique names, and in-use protection", async () => {
  const nbi = await call("POST", "/document-requirements/", { name: "NBI clearance", hasExpiry: true });
  assert.equal(nbi.status, 200);
  assert.equal(nbi.body.isRequired, true, "required by default");
  assert.equal(nbi.body.hasExpiry, true);

  assert.equal((await call("POST", "/document-requirements/", {})).status, 400);
  assert.equal((await call("POST", "/document-requirements/", { name: "  " })).status, 400);
  assert.equal((await call("POST", "/document-requirements/", { name: "nbi CLEARANCE " })).status, 409);

  const photo = await addRequirement({ name: "2x2 photo" });
  assert.equal((await call("PUT", `/document-requirements/${photo._id}`, { name: "NBI Clearance" })).status, 409);
  assert.equal((await call("PUT", `/document-requirements/${photo._id}`, { description: "White background" })).status, 200);
  const stored = (await call("GET", `/document-requirements/${photo._id}`)).body;
  assert.equal(stored.name, "2x2 photo");
  assert.equal(stored.description, "White background");

  // A requirement that has documents recorded cannot be deleted; an unused one can.
  await call("POST", "/employee-documents/", { employeeId: employee.id, requirementId: nbi.body._id });
  assert.equal((await call("DELETE", `/document-requirements/${nbi.body._id}`)).status, 409);
  assert.equal((await call("DELETE", `/document-requirements/${photo._id}`)).status, 200);
  assert.equal((await call("GET", `/document-requirements/${photo._id}`)).status, 404);

  // Clean up for the next test.
  const record = (await call("GET", "/employee-documents/")).body.data[0];
  await call("DELETE", `/employee-documents/${record._id}`);
  await call("DELETE", `/document-requirements/${nbi.body._id}`);
});

test("recording what an employee handed in", async () => {
  const contract = await addRequirement({ name: "Contract" });
  const dormant = await addRequirement({ name: "Old form", isActive: false });
  const post = (body) => call("POST", "/employee-documents/", body);

  const added = await post({ employeeId: employee.id, requirementId: contract._id });
  assert.equal(added.status, 200);
  assert.equal(added.body.status, "received", "handed in unless said otherwise");
  assert.equal(new Date(added.body.receivedAt).toISOString(), today.toISOString());
  assert.equal(added.body.reviewedBy, null);

  assert.equal((await post({ employeeId: employee.id, requirementId: contract._id })).status, 409, "one record per requirement");
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ employeeId: "nope", requirementId: contract._id })).status, 404);
  assert.equal((await post({ employeeId: inactiveEmployee.id, requirementId: contract._id })).status, 404);
  assert.equal((await post({ employeeId: employee.id, requirementId: "nope" })).status, 400);
  assert.equal((await post({ employeeId: employee.id, requirementId: dormant._id })).status, 400, "inactive requirement");
  assert.equal((await post({ employeeId: employee.id, requirementId: contract._id, expiryDate: "later" })).status, 400);

  // Verified and rejected cannot be set by hand, only by a review.
  const other = await addRequirement({ name: "Other" });
  assert.equal((await post({ employeeId: employee.id, requirementId: other._id, status: "verified" })).status, 400);
  const pending = await post({ employeeId: employee.id, requirementId: other._id, status: "pending" });
  assert.equal(pending.status, 200);
  assert.equal(pending.body.receivedAt, null, "nothing received yet");

  // Receiving it later stamps the date.
  const received = await call("PUT", `/employee-documents/${pending.body._id}`, { status: "received" });
  assert.equal(received.status, 200);
  assert.ok((await call("GET", `/employee-documents/${pending.body._id}`)).body.receivedAt);

  // Which employee and requirement a record belongs to cannot be changed.
  await call("PUT", `/employee-documents/${added.body._id}`, { employeeId: inactiveEmployee.id, requirementId: other._id });
  const unchanged = (await call("GET", `/employee-documents/${added.body._id}`)).body;
  assert.equal(unchanged.employeeId, employee.id);
  assert.equal(unchanged.requirementId, contract._id);

  for (const id of [added.body._id, pending.body._id]) await call("DELETE", `/employee-documents/${id}`);
  for (const r of [contract, dormant, other]) await call("DELETE", `/document-requirements/${r._id}`);
});

test("HR verifies or rejects, and the reviewer is the signed-in administrator", async () => {
  const id = await addRequirement({ name: "Medical", hasExpiry: true });
  const doc = (await call("POST", "/employee-documents/", { employeeId: employee.id, requirementId: id._id, reviewedBy: "forged" })).body;
  assert.equal(doc.reviewedBy, null, "a reviewer in the body is ignored");

  // A document that expires needs its date before it can be verified.
  assert.equal((await call("POST", `/employee-documents/${doc._id}/verify`)).status, 400);
  await call("PUT", `/employee-documents/${doc._id}`, { expiryDate: "2026-12-31" });

  const verified = await call("POST", `/employee-documents/${doc._id}/verify`);
  assert.equal(verified.status, 200);
  assert.equal(verified.body.status, "verified");
  assert.equal(verified.body.reviewedBy, REVIEWER);
  assert.ok(verified.body.reviewedAt);
  assert.equal((await call("POST", `/employee-documents/${doc._id}/verify`)).status, 409, "already verified");

  // Editing a verified record's remarks does not undo the verification.
  await call("PUT", `/employee-documents/${doc._id}`, { remarks: "Seen original" });
  assert.equal((await call("GET", `/employee-documents/${doc._id}`)).body.status, "verified");
  assert.equal((await call("PUT", `/employee-documents/${doc._id}`, { status: "verified" })).status, 400);

  // Rejecting needs a reason.
  assert.equal((await call("POST", `/employee-documents/${doc._id}/reject`, {})).status, 400);
  assert.equal((await call("POST", `/employee-documents/${doc._id}/reject`, { remarks: "  " })).status, 400);
  const rejected = await call("POST", `/employee-documents/${doc._id}/reject`, { remarks: "Photocopy is blurry" });
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.status, "rejected");
  assert.equal(rejected.body.remarks, "Photocopy is blurry");
  assert.equal((await call("POST", `/employee-documents/${doc._id}/verify`)).status, 409, "a rejected document must be handed in again");

  // Handing in a new copy clears the earlier review.
  const resubmitted = await call("PUT", `/employee-documents/${doc._id}`, { status: "received" });
  assert.equal(resubmitted.status, 200);
  const after = (await call("GET", `/employee-documents/${doc._id}`)).body;
  assert.equal(after.status, "received");
  assert.equal(after.reviewedBy, null);
  assert.equal(after.reviewedAt, null);

  assert.equal((await call("POST", "/employee-documents/nope/verify")).status, 404);
  await call("DELETE", `/employee-documents/${doc._id}`);
  await call("DELETE", `/document-requirements/${id._id}`);
});

test("the checklist lists every active requirement with its state and a summary", async () => {
  const contract = await addRequirement({ name: "Contract" });
  const nbi = await addRequirement({ name: "NBI", hasExpiry: true });
  const photo = await addRequirement({ name: "Photo" });
  const reference = await addRequirement({ name: "Reference letter", isRequired: false });
  await addRequirement({ name: "Retired form", isActive: false });

  const checklist = async () => (await call("GET", `/employee-documents/checklist/${employee.id}`)).body;
  const stateOf = (list, name) => list.data.find((line) => line.requirement.name === name).state;

  // Nothing handed in yet: everything is missing, and inactive requirements are not on the list.
  let list = await checklist();
  assert.equal(list.data.length, 4);
  assert.ok(list.data.every((line) => line.state === "missing" && line.document === null));
  assert.deepEqual(list.summary, {
    total: 4, required: 3, requiredVerified: 0, received: 0, pending: 0, rejected: 0, expired: 0, missing: 4, complete: false,
  });

  // A mix of states.
  const hand = async (requirement, extra = {}) =>
    (await call("POST", "/employee-documents/", { employeeId: employee.id, requirementId: requirement._id, ...extra })).body;
  const contractDoc = await hand(contract);
  await call("POST", `/employee-documents/${contractDoc._id}/verify`);
  const nbiDoc = await hand(nbi, { expiryDate: "2026-03-01" }); // already out of date on 2 March
  await hand(photo, { status: "pending" });

  list = await checklist();
  assert.equal(stateOf(list, "Contract"), "verified");
  assert.equal(stateOf(list, "NBI"), "expired");
  assert.equal(stateOf(list, "Photo"), "pending");
  assert.equal(stateOf(list, "Reference letter"), "missing");
  assert.equal(list.data.find((line) => line.requirement.name === "Contract").document.status, "verified");
  assert.equal(list.summary.requiredVerified, 1);
  assert.equal(list.summary.expired, 1);
  assert.equal(list.summary.complete, false);

  // Fix the lot: a fresh NBI, the photo received, then everything verified. The optional line can stay missing.
  await call("PUT", `/employee-documents/${nbiDoc._id}`, { expiryDate: "2027-03-01" });
  const photoDoc = (await call("GET", "/employee-documents/")).body.data.find((d) => d.requirementId === photo._id);
  await call("PUT", `/employee-documents/${photoDoc._id}`, { status: "received" });
  await call("POST", `/employee-documents/${nbiDoc._id}/verify`);
  await call("POST", `/employee-documents/${photoDoc._id}/verify`);

  list = await checklist();
  assert.equal(list.summary.requiredVerified, 3);
  assert.equal(list.summary.complete, true);
  assert.equal(stateOf(list, "Reference letter"), "missing");

  // A verified document that later passes its expiry no longer counts.
  today = new Date("2027-03-02T04:00:00.000Z");
  list = await checklist();
  assert.equal(stateOf(list, "NBI"), "expired");
  assert.equal(list.summary.complete, false);
  today = new Date("2026-03-02T04:00:00.000Z");

  assert.equal((await call("GET", "/employee-documents/checklist/nope")).status, 404);
  void reference;
});
