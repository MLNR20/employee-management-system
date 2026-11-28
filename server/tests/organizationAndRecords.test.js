// Positions per department, what deleting an employee keeps or removes, and uploaded document copies.
import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createPositionUseCases } from "../src/application/position/positionUseCases.js";
import { createDepartmentUseCases } from "../src/application/department/departmentUseCases.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";
import {
  createDocumentRequirementUseCases,
  createEmployeeDocumentUseCases,
} from "../src/application/document/documentUseCases.js";
import { createOffboardingUseCases } from "../src/application/employee/offboardingUseCases.js";
import { createEmployeeDocumentRouter } from "../src/presentation/http/routes/documentRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import { DEFAULT_ORGANIZATION } from "../src/domain/department/defaultOrganization.js";
import { checkUpload } from "../src/domain/document/fileRules.js";
import { DEFAULT_FILE_LIMITS } from "../src/domain/document/fileLimits.js";
import {
  InMemoryAttendanceRepository,
  InMemoryBorrowingRepository,
  InMemoryDocumentFileRepository,
  InMemoryDocumentRequirementRepository,
  InMemoryEmployeeDocumentRepository,
  InMemoryJobApplicationRepository,
  InMemoryLeaveBalanceRepository,
  InMemoryLeaveRequestRepository,
  InMemoryNotificationRepository,
  InMemoryPositionRepository,
  InMemorySalaryRateRepository,
  InMemoryShiftAssignmentRepository,
  createInMemoryDepartmentRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

const ADMIN = "000000000000000000000a01";

// --- Departments and positions ----------------------------------------------------------------------

const organization = () => {
  const departmentRepository = createInMemoryDepartmentRepository();
  const positionRepository = new InMemoryPositionRepository();
  return {
    departmentRepository,
    positionRepository,
    positions: createPositionUseCases({ positionRepository, departmentRepository }),
    departments: createDepartmentUseCases({ departmentRepository, positionRepository }),
  };
};

test("an empty organization gets the standard departments and positions, once", async () => {
  const { positions, positionRepository, departmentRepository } = organization();
  const total = DEFAULT_ORGANIZATION.flatMap((d) => d.positions).length;

  assert.deepEqual(await positions.ensureDefaultOrganization(), { departments: 4, positions: total });
  assert.deepEqual(await positions.ensureDefaultOrganization(), { departments: 0, positions: 0 });
  assert.equal((await departmentRepository.findAll()).length, 4);
  assert.equal((await positionRepository.findAll()).length, total);
});

test("existing departments are kept, and only matching ones get standard positions", async () => {
  const { positions, departmentRepository } = organization();
  await departmentRepository.create({ name: "information technology", code: "ICT" });
  await departmentRepository.create({ name: "Sales", code: "SAL" });

  assert.deepEqual(await positions.ensureDefaultOrganization(), { departments: 0, positions: 3 });
  assert.equal((await departmentRepository.findAll()).length, 2);
});

test("a position belongs to a real department, is unique within it, and holds the department", async () => {
  const { positions, departments } = organization();
  const sales = await departments.addDepartment({ name: "Sales", code: "SAL" });

  await assert.rejects(positions.addPosition({ name: "Rep" }), /departmentId/);
  await assert.rejects(positions.addPosition({ name: "Rep", departmentId: "nope" }), /does not exist/);
  const rep = await positions.addPosition({ name: "  Account Rep ", departmentId: sales.id });
  assert.equal(rep.name, "Account Rep");
  await assert.rejects(positions.addPosition({ name: "Account Rep", departmentId: sales.id }), /already has a position/);

  await assert.rejects(departments.deleteDepartment(sales.id), /has positions/);
  await positions.deletePosition(rep.id);
  await departments.deleteDepartment(sales.id);
});

// --- Deleting an employee ------------------------------------------------------------------------------

const records = () => {
  const repositories = {
    employeeRepository: createInMemoryEmployeeRepository(),
    attendanceRepository: new InMemoryAttendanceRepository(),
    salaryRateRepository: new InMemorySalaryRateRepository(),
    borrowingRepository: new InMemoryBorrowingRepository(),
    shifts: new InMemoryShiftAssignmentRepository(),
    documents: new InMemoryEmployeeDocumentRepository(),
    files: new InMemoryDocumentFileRepository(),
    applications: new InMemoryJobApplicationRepository(),
    notifications: new InMemoryNotificationRepository(),
  };
  const { shifts, documents, files, applications, notifications } = repositories;
  const employees = createEmployeeUseCases({
    ...repositories,
    leaveBalanceRepository: new InMemoryLeaveBalanceRepository(),
    leaveRequestRepository: new InMemoryLeaveRequestRepository(),
    employeeRecords: [shifts, documents, files, applications, notifications],
  });
  const hire = (name) => repositories.employeeRepository.create({ first_name: name, last_name: "Lee", email: `${name}@x.com` });
  return { ...repositories, employees, hire };
};

test("an employee with attendance, pay rates or borrowing history cannot be deleted", async () => {
  const { employees, hire, attendanceRepository, salaryRateRepository, borrowingRepository, employeeRepository } = records();
  const cases = [
    [attendanceRepository, { date: "2026-01-02", timeIn: new Date() }, /attendance records/],
    [salaryRateRepository, { hourlyRate: 100, effectiveFrom: "2026-01-01" }, /pay rate history/],
    [borrowingRepository, { itemId: "i1", returnedAt: new Date() }, /borrowing history/],
  ];
  for (const [index, [repository, record, message]] of cases.entries()) {
    const employee = await hire(`kept${index}`);
    await repository.create({ ...record, employeeId: employee.id });
    await assert.rejects(employees.deleteEmployee(employee.id), message);
    assert.ok(await employeeRepository.findById(employee.id));
  }
});

test("deleting a record made by mistake takes its other records out of use, and nobody else's", async () => {
  const { employees, hire, shifts, documents, files, applications, notifications } = records();
  const mistake = await hire("mistake");
  const other = await hire("other");
  for (const { id } of [mistake, other]) {
    await shifts.create({ employeeId: id, shiftId: "s1", effectiveFrom: "2026-01-01" });
    await documents.create({ employeeId: id, requirementId: "r1" });
    await files.save({ employeeId: id, name: "a.pdf" });
    await applications.create({ employeeId: id, jobId: "j1" });
    await notifications.create({ recipientEmployeeId: id, title: "Hi" });
  }

  await employees.deleteEmployee(mistake.id);

  for (const repository of [shifts, documents, applications]) {
    assert.deepEqual((await repository.findAll()).map((r) => r.employeeId), [other.id]);
  }
  assert.deepEqual(files.live().map((f) => f.employeeId), [other.id]);
  assert.deepEqual((await notifications.findAll()).map((n) => n.recipientEmployeeId), [other.id]);
  await assert.rejects(employees.deleteEmployee(mistake.id), /not found/);
});

// --- Uploaded document copies ----------------------------------------------------------------------

const PDF = Buffer.from("%PDF-1.7\nfirst");
const MAX_FILE_BYTES = DEFAULT_FILE_LIMITS.maxFileBytes;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);

test("a file is accepted by what it contains, and its name is made safe", () => {
  assert.deepEqual(
    { ...checkUpload({ name: "..\\..\\scan\u0000 \"x\".exe", data: PDF }), data: undefined },
    { name: "scan x.exe.pdf", contentType: "application/pdf", size: PDF.length, data: undefined }
  );
  assert.equal(checkUpload({ name: "photo.JPEG", data: Buffer.from([0xff, 0xd8, 0xff, 0]) }).name, "photo.jpeg");
  assert.equal(checkUpload({ data: PNG }).name, "document.png");
  assert.throws(() => checkUpload({ name: "a.pdf", data: Buffer.from("<html><script>") }), /Only PDF, PNG and JPEG/);
  assert.throws(() => checkUpload({ name: "a.pdf", data: Buffer.alloc(0) }), /Send a PDF/);
  assert.throws(() => checkUpload({ name: "a.pdf", data: { length: 5 } }), /Send a PDF/);
  assert.throws(() => checkUpload({ data: Buffer.concat([PDF, Buffer.alloc(MAX_FILE_BYTES)]) }), /larger than 5 MB/);
});

test("upload, download, replace, review and delete a document copy", async () => {
  const documentRequirementRepository = new InMemoryDocumentRequirementRepository();
  const employeeDocumentRepository = new InMemoryEmployeeDocumentRepository();
  const documentFileRepository = new InMemoryDocumentFileRepository();
  const employeeRepository = createInMemoryEmployeeRepository();
  const employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "a@x.com" });
  const contract = await documentRequirementRepository.create({ name: "Contract" });
  const clearance = await documentRequirementRepository.create({ name: "Clearance", stage: "offboarding" });
  createDocumentRequirementUseCases({ documentRequirementRepository, employeeDocumentRepository });
  const useCases = createEmployeeDocumentUseCases({
    employeeDocumentRepository,
    documentRequirementRepository,
    documentFileRepository,
    employeeRepository,
  });
  const record = await useCases.addEmployeeDocument({ employeeId: employee.id, requirementId: contract.id });

  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    req.user = { id: ADMIN };
    next();
  };
  app.use("/employee-documents", createEmployeeDocumentRouter({ employeeDocumentUseCases: useCases, requireAuth }));
  app.use(errorHandler);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const base = `http://localhost:${server.address().port}/employee-documents`;
  const put = async (body, name = "contract.pdf", type = "application/pdf") => {
    const response = await fetch(`${base}/${record.id}/file?name=${encodeURIComponent(name)}`, {
      method: "PUT",
      headers: { "Content-Type": type },
      body,
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    const uploaded = await put(PDF, "Signed 'contract'.pdf");
    assert.equal(uploaded.status, 200);
    assert.equal(uploaded.body.file.name, "Signed 'contract'.pdf");
    assert.equal(uploaded.body.file.size, PDF.length);
    assert.equal(uploaded.body.file.uploadedBy, ADMIN);
    assert.equal("data" in uploaded.body.file, false, "listing a record never sends the contents");

    const download = await fetch(`${base}/files/${uploaded.body.file.id}`);
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "application/pdf");
    assert.equal(download.headers.get("x-content-type-options"), "nosniff");
    assert.match(download.headers.get("content-disposition"), /^attachment; filename\*=UTF-8''Signed%20%27contract%27\.pdf$/);
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), PDF);

    assert.equal((await put("not a document")).status, 400);
    const huge = await put(Buffer.concat([PDF, Buffer.alloc(MAX_FILE_BYTES)]));
    assert.equal(huge.status, 400);
    assert.match(huge.body.message, /larger than 5 MB/);
    // The wrong type claimed by the sender changes nothing: the content decides.
    assert.equal((await put('{"a":1}', "x.json", "application/json")).status, 400);

    // A new copy has to be checked again, and the old file is gone.
    await useCases.verifyDocument(record.id, ADMIN);
    const replaced = await put(PNG, "new.png", "text/plain");
    assert.equal(replaced.body.status, "received");
    assert.equal(replaced.body.reviewedBy, null);
    assert.equal(replaced.body.file.contentType, "image/png");
    assert.equal(documentFileRepository.live().length, 1);
    assert.equal(documentFileRepository.files.size, 2, "the replaced file is kept");
    assert.equal((await fetch(`${base}/files/${uploaded.body.file.id}`)).status, 404);

    // A body cannot point a record at a file.
    await fetch(`${base}/${record.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file: { id: "forged" } }),
    });
    assert.equal((await useCases.getEmployeeDocument(record.id)).file.id, replaced.body.file.id);

    await useCases.verifyDocument(record.id, ADMIN);
    const removed = await fetch(`${base}/${record.id}/file`, { method: "DELETE" });
    assert.equal((await removed.json()).status, "received");
    assert.equal(documentFileRepository.live().length, 0);
    assert.equal((await fetch(`${base}/${record.id}/file`, { method: "DELETE" })).status, 404);

    await put(PDF);
    await useCases.deleteEmployeeDocument(record.id);
    assert.equal(documentFileRepository.live().length, 0);
  } finally {
    server.close();
  }

  // Offboarding copies: cancelling discards them, rehiring keeps them with the history.
  const offboarding = createOffboardingUseCases({
    employeeRepository,
    employeeDocumentUseCases: useCases,
    now: () => new Date("2026-03-02T00:00:00Z"),
  });
  const leave = { separationType: "resignation", lastWorkingDay: "2026-03-02" };
  const handIn = async () => {
    const doc = await useCases.addEmployeeDocument({ employeeId: employee.id, requirementId: clearance.id });
    return (await useCases.attachFile(doc.id, { name: "c.pdf", data: PDF }, ADMIN)).file.id;
  };

  await offboarding.start(employee.id, leave, ADMIN);
  await handIn();
  await offboarding.cancel(employee.id);
  assert.equal(documentFileRepository.live().length, 0);

  await offboarding.start(employee.id, leave, ADMIN);
  const kept = await handIn();
  await offboarding.complete(employee.id, { rehireStatus: "rehireable" }, ADMIN);
  const rehired = await offboarding.rehire(employee.id, ADMIN);
  assert.equal(rehired.history[0].documents[0].file.id, kept);
  assert.equal((await useCases.getFile(kept)).name, "c.pdf");
});
