// How much can be uploaded: one file, an employee's current files, and everything stored.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createEmployeeDocumentUseCases } from "../src/application/document/documentUseCases.js";
import { createEmployeeDocumentRouter } from "../src/presentation/http/routes/documentRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  DEFAULT_FILE_LIMITS,
  MAX_ALLOWED_FILE_MB,
  assertWithinLimits,
  resolveFileLimits,
} from "../src/domain/document/fileLimits.js";
import {
  InMemoryDocumentFileRepository,
  InMemoryDocumentRequirementRepository,
  InMemoryEmployeeDocumentRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const MB = 1024 * 1024;

test("the limits have defaults and come from the environment", () => {
  const quiet = () => assert.fail("no warning expected");
  assert.deepEqual(resolveFileLimits({}, quiet), DEFAULT_FILE_LIMITS);
  assert.deepEqual(
    resolveFileLimits(
      {
        DOCUMENT_MAX_FILE_MB: "2",
        DOCUMENT_MAX_FILES_PER_EMPLOYEE: "3",
        DOCUMENT_MAX_MB_PER_EMPLOYEE: "4",
        DOCUMENT_MAX_TOTAL_MB: "10",
      },
      quiet
    ),
    { maxFileBytes: 2 * MB, maxFilesPerEmployee: 3, maxEmployeeBytes: 4 * MB, maxTotalBytes: 10 * MB }
  );
});

test("a nonsense setting is ignored and one file never exceeds what the database holds", () => {
  const warnings = [];
  const limits = resolveFileLimits(
    { DOCUMENT_MAX_FILE_MB: "100", DOCUMENT_MAX_FILES_PER_EMPLOYEE: "0", DOCUMENT_MAX_TOTAL_MB: "lots" },
    (message) => warnings.push(message)
  );
  assert.equal(limits.maxFileBytes, MAX_ALLOWED_FILE_MB * MB);
  assert.equal(limits.maxFilesPerEmployee, DEFAULT_FILE_LIMITS.maxFilesPerEmployee);
  assert.equal(limits.maxTotalBytes, DEFAULT_FILE_LIMITS.maxTotalBytes);
  assert.equal(warnings.length, 3);
});

test("a replacement frees the old file's share of the employee's limits, not of the storage", () => {
  const limits = { maxFileBytes: 100, maxFilesPerEmployee: 2, maxEmployeeBytes: 150, maxTotalBytes: 1000 };
  const check = (input) => () =>
    assertWithinLimits({ size: 50, replacing: null, usage: { count: 0, bytes: 0 }, totalBytes: 0, ...input }, limits);

  assert.doesNotThrow(check({ usage: { count: 1, bytes: 100 } }), "exactly at the limit is allowed");
  assert.throws(check({ usage: { count: 2, bytes: 10 } }), /already has 2 files/);
  assert.throws(check({ usage: { count: 1, bytes: 101 } }), /past/);
  assert.doesNotThrow(check({ usage: { count: 2, bytes: 150 }, replacing: { size: 60 } }));
  assert.throws(check({ usage: { count: 2, bytes: 150 }, replacing: { size: 40 } }), /past/);
  assert.throws(check({ totalBytes: 951 }), /storage is full/);
  assert.throws(check({ totalBytes: 951, replacing: { size: 90 }, usage: { count: 1, bytes: 90 } }), /storage is full/);
});

/** An app with tiny limits: files of `pdf(bytes)` size, two per employee. */
const setup = async (fileLimits) => {
  const documentRequirementRepository = new InMemoryDocumentRequirementRepository();
  const employeeDocumentRepository = new InMemoryEmployeeDocumentRepository();
  const documentFileRepository = new InMemoryDocumentFileRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  const useCases = createEmployeeDocumentUseCases({
    employeeDocumentRepository,
    documentRequirementRepository,
    documentFileRepository,
    employeeRepository,
    fileLimits,
  });
  const employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "a@x.com" });
  const records = [];
  for (const name of ["One", "Two", "Three"]) {
    const requirement = await documentRequirementRepository.create({ name });
    records.push(await useCases.addEmployeeDocument({ employeeId: employee.id, requirementId: requirement.id }));
  }
  const pdf = (bytes) => Buffer.concat([Buffer.from("%PDF-"), Buffer.alloc(bytes - 5)]);
  const upload = (record, bytes) => useCases.attachFile(record.id, { name: "a.pdf", data: pdf(bytes) }, "admin");
  return { useCases, documentFileRepository, employee, records, pdf, upload };
};

const LIMITS = { maxFileBytes: 100, maxFilesPerEmployee: 2, maxEmployeeBytes: 150, maxTotalBytes: 300 };

test("uploads are held to every limit, and removed files still fill the storage", async () => {
  const { useCases, documentFileRepository, employee, records, upload } = await setup(LIMITS);
  const [one, two, three] = records;

  await assert.rejects(upload(one, 101), /larger than/);
  await upload(one, 100);
  await assert.rejects(upload(two, 60), /past/);
  await upload(two, 50);
  await assert.rejects(upload(three, 10), /already has 2 files/);

  await upload(one, 90); // replaces the 100: allowed, though a third file would not be
  assert.equal(documentFileRepository.live().length, 2);
  assert.equal(await documentFileRepository.totalBytes(), 240);

  // Removing frees the employee's share; the storage still holds the file.
  await useCases.removeFile(one.id);
  await assert.rejects(upload(three, 61), /storage is full/);
  await upload(three, 60);
  assert.equal(await documentFileRepository.totalBytes(), 300);

  const { files } = await useCases.checklist(employee.id);
  assert.deepEqual(files, { ...LIMITS, count: 2, bytes: 110, totalBytes: 300 });
});

test("two uploads at once cannot both slip under a limit", async () => {
  const { documentFileRepository, records, upload } = await setup(LIMITS);
  const results = await Promise.allSettled(records.map((record) => upload(record, 40)));

  assert.deepEqual(results.map((r) => r.status), ["fulfilled", "fulfilled", "rejected"]);
  assert.equal(documentFileRepository.live().length, 2);
  // A refused upload does not stop the next one.
  await upload(records[0], 40);
});

test("the HTTP upload refuses a body over the configured size and reports the limits", async () => {
  const { useCases, employee, records, pdf } = await setup(LIMITS);
  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    req.user = { id: "admin" };
    next();
  };
  app.use("/employee-documents", createEmployeeDocumentRouter({ employeeDocumentUseCases: useCases, requireAuth }));
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://localhost:${server.address().port}/employee-documents`;
  const put = (bytes) =>
    fetch(`${base}/${records[0].id}/file?name=a.pdf`, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf" },
      body: pdf(bytes),
    });

  try {
    const refused = await put(101);
    assert.equal(refused.status, 400);
    assert.match((await refused.json()).message, /larger than/);
    assert.equal((await put(100)).status, 200);

    const checklist = await (await fetch(`${base}/checklist/${employee.id}`)).json();
    assert.deepEqual(checklist.files, { ...LIMITS, count: 1, bytes: 100, totalBytes: 100 });
  } finally {
    server.close();
  }
});
