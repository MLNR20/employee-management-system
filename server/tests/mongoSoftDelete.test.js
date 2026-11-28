// Soft delete against a real MongoDB, which the in-memory fakes cannot show. Skipped unless
// MONGO_TEST_URI names an empty throwaway database whose name starts with "ems_test_"; the database is
// dropped afterwards. From the server folder (PowerShell):
//   $env:MONGO_TEST_URI = "mongodb://127.0.0.1:27017/ems_test_local"; npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { replaceLegacyUniqueIndexes } from "../src/infrastructure/persistence/mongo/softDeleteIndexes.js";
import { MongoEmployeeRepository } from "../src/infrastructure/persistence/mongo/MongoEmployeeRepository.js";
import { MongoEmergencyContactRepository } from "../src/infrastructure/persistence/mongo/MongoEmergencyContactRepository.js";
import {
  MongoLeaveBalanceRepository,
  MongoLeaveRequestRepository,
} from "../src/infrastructure/persistence/mongo/MongoLeaveRepositories.js";
import { MongoShiftAssignmentRepository } from "../src/infrastructure/persistence/mongo/MongoShiftRepositories.js";
import {
  MongoDocumentFileRepository,
  MongoEmployeeDocumentRepository,
} from "../src/infrastructure/persistence/mongo/MongoDocumentRepositories.js";
import { MongoJobApplicationRepository } from "../src/infrastructure/persistence/mongo/MongoJobApplicationRepository.js";
import { MongoNotificationRepository } from "../src/infrastructure/persistence/mongo/MongoNotificationRepository.js";
import { createEmployeeUseCases } from "../src/application/employee/employeeUseCases.js";

const uri = process.env.MONGO_TEST_URI;
const skip = uri ? false : "set MONGO_TEST_URI to run";
const id = () => String(new mongoose.Types.ObjectId());
let db;
let ownsDatabase = false;

before(async () => {
  if (skip) return;
  const name = new URL(uri).pathname.slice(1);
  assert.match(name, /^ems_test_\w+$/, "MONGO_TEST_URI must name a database starting with ems_test_");
  await mongoose.connect(uri, { autoIndex: false, serverSelectionTimeoutMS: 5000 });
  db = mongoose.connection.db;
  assert.equal((await db.listCollections().toArray()).length, 0, "the test database must start empty");
  ownsDatabase = true;
});

after(async () => {
  if (ownsDatabase) await db.dropDatabase();
  if (!skip) await mongoose.disconnect();
});

const stored = (collection, filter = {}) => db.collection(collection).find(filter).toArray();
const newEmployee = (email) => ({
  first_name: "Ann",
  last_name: "Lee",
  email,
  position: "Accountant",
  department: "Finance",
  salary: 100,
});

test("an older database has its unique indexes replaced, once, and its records stay visible", { skip }, async () => {
  // What an install from before soft delete looks like.
  const legacy = { ...newEmployee("legacy@example.com"), isActive: true };
  const { insertedId } = await db.collection("employees").insertOne(legacy);
  await db.collection("employees").createIndex({ email: 1 }, { unique: true });
  await db.collection("employeedocuments").createIndex({ employeeId: 1, requirementId: 1 }, { unique: true });
  await db.collection("leavebalances").createIndex({ employeeId: 1, leaveTypeId: 1 }, { unique: true });
  await db.collection("jobapplications").createIndex({ employeeId: 1, jobId: 1 }, { unique: true });

  assert.deepEqual((await replaceLegacyUniqueIndexes()).sort(), [
    "employeedocuments.employeeId_1_requirementId_1",
    "employees.email_1",
    "jobapplications.employeeId_1_jobId_1",
    "leavebalances.employeeId_1_leaveTypeId_1",
  ]);
  assert.deepEqual(await replaceLegacyUniqueIndexes(), []);

  const employees = new MongoEmployeeRepository();
  assert.equal((await employees.findById(String(insertedId))).email, "legacy@example.com");
  // A record with no deletedAt field at all still holds its email.
  await assert.rejects(employees.create(newEmployee("legacy@example.com")), /already exists/);
});

test("a deleted employee is gone to the app, kept in the database, and frees the email", { skip }, async () => {
  const employees = new MongoEmployeeRepository();
  const first = await employees.create(newEmployee("ann@example.com"));
  await employees.setPassword(first.id, "hash");
  await assert.rejects(employees.create(newEmployee("ann@example.com")), /already exists/);
  const before = await employees.summary();

  assert.equal(await employees.remove(first.id), true);
  assert.equal(await employees.remove(first.id), false, "already deleted");
  assert.equal(await employees.findById(first.id), null);
  assert.equal(await employees.update(first.id, { position: "Ghost" }), null);
  assert.equal(await employees.findCredentialsByEmail("ann@example.com"), null);
  assert.ok(!(await employees.findAll()).some((e) => e.id === first.id));
  assert.equal((await employees.findPage({ page: 1, pageSize: 50, search: "ann@" })).total, 0);
  assert.equal((await employees.summary()).total, before.total - 1);

  const [kept] = await stored("employees", { _id: new mongoose.Types.ObjectId(first.id) });
  assert.equal(kept.email, "ann@example.com");
  assert.equal(kept.passwordHash, "hash");
  assert.ok(kept.deletedAt instanceof Date);

  // The same email can be used again, and deleted again.
  const second = await employees.create(newEmployee("ann@example.com"));
  assert.equal((await employees.findCredentialsByEmail("ann@example.com")).id, second.id);
  assert.equal(await employees.remove(second.id), true);
  await employees.create(newEmployee("ann@example.com"));
  assert.equal((await stored("employees", { email: "ann@example.com" })).length, 3);
});

test("deleting an employee soft deletes every record about them, and only theirs", { skip }, async () => {
  const repositories = {
    employeeRepository: new MongoEmployeeRepository(),
    leaveBalanceRepository: new MongoLeaveBalanceRepository(),
    leaveRequestRepository: new MongoLeaveRequestRepository(),
    emergencyContactRepository: new MongoEmergencyContactRepository(),
  };
  const shifts = new MongoShiftAssignmentRepository();
  const documents = new MongoEmployeeDocumentRepository();
  const files = new MongoDocumentFileRepository();
  const applications = new MongoJobApplicationRepository();
  const notifications = new MongoNotificationRepository();
  const useCases = createEmployeeUseCases({
    ...repositories,
    employeeRecords: [shifts, documents, files, applications, notifications],
  });
  const { employeeRepository, leaveBalanceRepository, emergencyContactRepository } = repositories;

  const mistake = await employeeRepository.create(newEmployee("mistake@example.com"));
  const other = await employeeRepository.create(newEmployee("other@example.com"));
  const leaveTypeId = id();
  const requirementId = id();
  const jobId = id();
  const give = async (employeeId) => {
    const balance = await leaveBalanceRepository.create({ employeeId, leaveTypeId, maxLeaves: 5, availableLeaves: 5 });
    await emergencyContactRepository.create({ employeeId, firstName: "Bo", lastName: "Lee", relationship: "Parent", phoneNumber: "1" });
    await shifts.create({ employeeId, shiftId: id(), effectiveFrom: "2026-01-01", assignedBy: id() });
    await documents.create({ employeeId, requirementId });
    await files.save({ employeeId, name: "a.pdf", contentType: "application/pdf", size: 4, data: Buffer.from("%PDF") });
    await applications.create({ employeeId, jobId, resumeLink: "https://example.com/cv" });
    await notifications.create({ recipientEmployeeId: employeeId, title: "Hello" });
    return balance;
  };
  const balance = await give(mistake.id);
  await give(other.id);

  await useCases.deleteEmployee(mistake.id);

  assert.deepEqual(await leaveBalanceRepository.findByEmployeeId(mistake.id), []);
  assert.equal(await leaveBalanceRepository.findById(balance.id), null);
  assert.equal(await leaveBalanceRepository.deductAvailable(balance.id, 1), null, "cannot be spent");
  assert.deepEqual(await emergencyContactRepository.findByEmployeeId(mistake.id), []);
  assert.deepEqual(await shifts.findByEmployeeId(mistake.id), []);
  assert.equal(await shifts.findEffective(mistake.id, "2026-06-01"), null);
  assert.deepEqual(await documents.findByEmployeeId(mistake.id), []);
  assert.equal(await documents.findByEmployeeAndRequirement(mistake.id, requirementId), null);
  assert.deepEqual(await files.usage(mistake.id), { count: 0, bytes: 0 });
  assert.deepEqual(await applications.findByEmployeeId(mistake.id), []);
  assert.equal((await notifications.findPageForEmployee(mistake.id, { page: 1, pageSize: 10 })).total, 0);
  assert.equal(await notifications.countUnreadForEmployee(mistake.id), 0);
  assert.equal(await notifications.markAllReadForEmployee(mistake.id), 0);

  const collections = [
    ["leavebalances", "employeeId"],
    ["emergencycontacts", "employeeId"],
    ["shiftassignments", "employeeId"],
    ["employeedocuments", "employeeId"],
    ["documentfiles", "employeeId"],
    ["jobapplications", "employeeId"],
    ["notifications", "recipientEmployeeId"],
  ];
  for (const [collection, field] of collections) {
    const mine = await stored(collection, { [field]: new mongoose.Types.ObjectId(mistake.id) });
    assert.equal(mine.length, 1, `${collection} keeps the record`);
    assert.ok(mine[0].deletedAt instanceof Date, collection);
    const theirs = await stored(collection, { [field]: new mongoose.Types.ObjectId(other.id) });
    assert.equal(theirs[0].deletedAt, null, `${collection} of someone else is untouched`);
  }
  assert.equal(await leaveBalanceRepository.existsForLeaveType(leaveTypeId), true, "someone else still has one");
});

test("a deleted record can be recorded again, and live ones stay unique", { skip }, async () => {
  const documents = new MongoEmployeeDocumentRepository();
  const balances = new MongoLeaveBalanceRepository();
  const applications = new MongoJobApplicationRepository();
  const employeeId = id();
  const cases = [
    [documents, { employeeId, requirementId: id() }],
    [balances, { employeeId, leaveTypeId: id(), maxLeaves: 1, availableLeaves: 1 }],
    [applications, { employeeId, jobId: id(), resumeLink: "https://example.com/cv" }],
  ];
  for (const [repository, record] of cases) {
    for (let round = 0; round < 3; round++) {
      const created = await repository.create(record);
      await assert.rejects(repository.create(record));
      assert.equal(await repository.remove(created.id), true);
      await new Promise((resolve) => setTimeout(resolve, 5)); // distinct deletion times
    }
  }
});

test("removed files are kept, count towards storage and not towards the employee", { skip }, async () => {
  const files = new MongoDocumentFileRepository();
  const employeeId = id();
  const data = Buffer.from("%PDF-1.7");
  const startingTotal = await files.totalBytes();
  const save = () => files.save({ employeeId, name: "a.pdf", contentType: "application/pdf", size: data.length, data });

  const first = await save();
  await save();
  assert.deepEqual(await files.usage(employeeId), { count: 2, bytes: 16 });
  assert.deepEqual((await files.findById(first.id)).data, data);

  await files.remove(first.id);
  const [removed] = await stored("documentfiles", { _id: new mongoose.Types.ObjectId(first.id) });
  assert.equal(await files.findById(first.id), null);
  assert.deepEqual(await files.usage(employeeId), { count: 1, bytes: 8 });
  assert.equal(await files.totalBytes(), startingTotal + 16);

  await files.removeForEmployee(employeeId);
  const [again] = await stored("documentfiles", { _id: new mongoose.Types.ObjectId(first.id) });
  assert.deepEqual(again.deletedAt, removed.deletedAt, "an earlier deletion keeps its time");
});
