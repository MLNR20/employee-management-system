// In-memory implementations of the domain contracts, for tests.
import { Repository } from "../src/domain/Repository.js";
import { AdministratorRepository } from "../src/domain/administrator/AdministratorRepository.js";
import { Administrator } from "../src/domain/administrator/Administrator.js";
import { Employee } from "../src/domain/employee/Employee.js";
import { Department } from "../src/domain/department/Department.js";
import { Role } from "../src/domain/role/Role.js";
import { RoleAssignment } from "../src/domain/role/RoleAssignment.js";
import { LeaveType } from "../src/domain/leave/LeaveType.js";
import { LeaveBalance } from "../src/domain/leave/LeaveBalance.js";
import { LeaveRequest } from "../src/domain/leave/LeaveRequest.js";
import { LeaveApproval } from "../src/domain/leave/LeaveApproval.js";
import { AuditLog } from "../src/domain/audit/AuditLog.js";
import { Item } from "../src/domain/inventory/Item.js";
import { Borrowing } from "../src/domain/inventory/Borrowing.js";
import { Attendance } from "../src/domain/attendance/Attendance.js";
import { SalaryRate } from "../src/domain/salary/SalaryRate.js";
import { WorkShift } from "../src/domain/shift/WorkShift.js";
import { ShiftAssignment } from "../src/domain/shift/ShiftAssignment.js";
import { nameKey, scheduleKey } from "../src/domain/shift/shiftRules.js";
import { DocumentRequirement } from "../src/domain/document/DocumentRequirement.js";
import { EmployeeDocument } from "../src/domain/document/EmployeeDocument.js";
import { requirementNameKey } from "../src/domain/document/documentRules.js";
import {
  DuplicateAdministratorError,
  DuplicateDepartmentError,
  DuplicateEmployeeError,
  DuplicateItemError,
  DuplicateLeaveBalanceError,
  DuplicateLeaveTypeError,
  DuplicateRoleAssignmentError,
  DuplicateRoleError,
  DuplicateShiftError,
  DuplicateDocumentRequirementError,
  DuplicateEmployeeDocumentError,
} from "../src/domain/errors.js";

let nextId = 1;
const newId = () => String(nextId++).padStart(24, "0"); // looks like an ObjectId

/** Generic in-memory Repository: mirrors what MongoRepository does for a real collection. */
export class InMemoryRepository extends Repository {
  items = new Map();

  /**
   * @param {(props: object) => import("../src/domain/Entity").Entity} createEntity
   * @param {string[][]} uniqueKeys each key is a list of fields that must be unique together
   * @param {() => Error} duplicateError
   */
  constructor(createEntity, uniqueKeys, duplicateError) {
    super();
    this.createEntity = createEntity;
    this.uniqueKeys = uniqueKeys;
    this.duplicateError = duplicateError;
  }

  #isDuplicate(data, exceptId) {
    return [...this.items.values()].some(
      (item) =>
        item.id !== exceptId &&
        this.uniqueKeys.some((key) => key.every((field) => item[field] === data[field]))
    );
  }

  async findAll() {
    return [...this.items.values()];
  }

  async findPage({ page, pageSize, search, sortBy, sortDir = 1 }) {
    let matches = [...this.items.values()];
    const needle = search?.toLowerCase();
    if (needle) {
      matches = matches.filter((item) =>
        Object.values(item).some((value) => typeof value === "string" && value.toLowerCase().includes(needle))
      );
    }
    if (sortBy) {
      matches.sort((x, y) => sortDir * String(x[sortBy] ?? "").localeCompare(String(y[sortBy] ?? ""), undefined, { numeric: true }));
    }
    return { items: matches.slice((page - 1) * pageSize, page * pageSize), total: matches.length };
  }

  async summary() {
    const all = [...this.items.values()];
    const inactive = all.filter((item) => item.isActive === false).length;
    return { total: all.length, active: all.length - inactive, inactive };
  }

  async findById(id) {
    return this.items.get(id) ?? null;
  }

  async create(data) {
    if (this.#isDuplicate(data)) throw this.duplicateError();
    const now = new Date();
    const item = this.createEntity({ ...data, id: newId(), dateCreated: now, dateUpdated: now });
    this.items.set(item.id, item);
    return item;
  }

  async update(id, data) {
    const existing = this.items.get(id);
    if (!existing) return null;
    if (this.#isDuplicate({ ...existing, ...data }, id)) throw this.duplicateError();
    const updated = this.createEntity({ ...existing, ...data, dateUpdated: new Date() });
    this.items.set(id, updated);
    return updated;
  }

  async remove(id) {
    return this.items.delete(id);
  }
}

export class InMemoryEmployeeRepository extends InMemoryRepository {
  passwords = new Map();

  constructor() {
    super((props) => new Employee(props), [["email"]], () => new DuplicateEmployeeError());
  }

  async setPassword(id, passwordHash) {
    this.passwords.set(id, passwordHash);
  }

  async findCredentialsByEmail(email) {
    const employee = [...this.items.values()].find((e) => e.email === String(email).trim().toLowerCase());
    if (!employee) return null;
    return {
      id: employee.id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      isActive: employee.isActive !== false,
      passwordHash: this.passwords.get(employee.id) ?? "",
    };
  }
}

export const createInMemoryEmployeeRepository = () => new InMemoryEmployeeRepository();

export const createInMemoryDepartmentRepository = () =>
  new InMemoryRepository(
    (props) => new Department(props),
    [["name"], ["code"]],
    () => new DuplicateDepartmentError()
  );

export const createInMemoryRoleRepository = () =>
  new InMemoryRepository((props) => new Role(props), [["name"]], () => new DuplicateRoleError());

export const createInMemoryLeaveTypeRepository = () =>
  new InMemoryRepository((props) => new LeaveType(props), [["name"]], () => new DuplicateLeaveTypeError());

export class InMemoryLeaveBalanceRepository extends InMemoryRepository {
  constructor() {
    super(
      (props) => new LeaveBalance(props),
      [["employeeId", "leaveTypeId"]],
      () => new DuplicateLeaveBalanceError()
    );
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()].filter((b) => b.employeeId === employeeId);
  }

  async findByEmployeeAndType(employeeId, leaveTypeId) {
    return (
      [...this.items.values()].find(
        (b) => b.employeeId === employeeId && b.leaveTypeId === leaveTypeId
      ) ?? null
    );
  }

  async deductAvailable(id, amount) {
    const balance = this.items.get(id);
    if (!balance || balance.availableLeaves < amount) return null;
    const updated = new LeaveBalance({ ...balance, availableLeaves: balance.availableLeaves - amount });
    this.items.set(id, updated);
    return updated;
  }

  async restoreAvailable(id, amount) {
    const balance = this.items.get(id);
    if (balance) {
      this.items.set(id, new LeaveBalance({ ...balance, availableLeaves: balance.availableLeaves + amount }));
    }
  }

  async existsForLeaveType(leaveTypeId) {
    return [...this.items.values()].some((b) => b.leaveTypeId === leaveTypeId);
  }

  async removeForEmployee(employeeId) {
    for (const [id, balance] of this.items) {
      if (balance.employeeId === employeeId) this.items.delete(id);
    }
  }
}

export class InMemoryLeaveRequestRepository extends InMemoryRepository {
  constructor() {
    super((props) => new LeaveRequest(props), [], () => new Error("unreachable"));
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()].filter((r) => r.employeeId === employeeId);
  }

  async findApprovedBetween(fromDay, toDay) {
    const day = (value) => new Date(value).toISOString().slice(0, 10);
    return [...this.items.values()].filter(
      (r) => r.status === "approved" && day(r.startDate) <= toDay && day(r.endDate) >= fromDay
    );
  }

  async transitionStatus(id, from, to) {
    const request = this.items.get(id);
    if (!request || request.status !== from) return null;
    const updated = new LeaveRequest({ ...request, status: to, dateUpdated: new Date() });
    this.items.set(id, updated);
    return updated;
  }

  async existsForLeaveType(leaveTypeId) {
    return [...this.items.values()].some((r) => r.leaveTypeId === leaveTypeId);
  }
}

export class InMemoryLeaveApprovalRepository extends InMemoryRepository {
  constructor() {
    super((props) => new LeaveApproval(props), [], () => new Error("unreachable"));
  }

  async findByLeaveRequestId(leaveRequestId) {
    return [...this.items.values()].filter((a) => a.leaveRequestId === leaveRequestId);
  }
}

export class InMemoryRoleAssignmentRepository extends InMemoryRepository {
  constructor() {
    super(
      (props) => new RoleAssignment(props),
      [["administratorId", "roleId"]], // one assignment per administrator and role
      () => new DuplicateRoleAssignmentError()
    );
  }

  async existsForRole(roleId) {
    return [...this.items.values()].some((assignment) => assignment.roleId === roleId);
  }

  async findByAdministratorId(administratorId) {
    return [...this.items.values()].filter((assignment) => assignment.administratorId === administratorId);
  }
}

export class InMemoryAdministratorRepository extends AdministratorRepository {
  admins = new Map();
  refreshHashes = new Map();

  async findById(id) {
    return this.admins.get(id) ?? null;
  }

  async findByUsername(username) {
    return [...this.admins.values()].find((a) => a.username === username) ?? null;
  }

  async findAll() {
    return [...this.admins.values()];
  }

  async count() {
    return this.admins.size;
  }

  async create(data) {
    const taken = [...this.admins.values()].some(
      (a) => a.username === data.username || a.email === data.email
    );
    if (taken) throw new DuplicateAdministratorError();
    const admin = new Administrator({ ...data, id: newId(), dateCreated: new Date() });
    this.admins.set(admin.id, admin);
    return admin;
  }

  async setRefreshTokenHash(id, hash) {
    this.refreshHashes.set(id, hash);
  }

  async rotateRefreshTokenHash(id, expectedHash, newHash) {
    if (this.refreshHashes.get(id) !== expectedHash) return false;
    this.refreshHashes.set(id, newHash);
    return true;
  }
}

/** Append-only like the real one: entries can be created and read, never changed or removed. */
export class InMemoryAuditLogRepository extends InMemoryRepository {
  constructor() {
    super((props) => new AuditLog(props), [], () => new Error("duplicate"));
  }

  async update() {
    throw new Error("Audit logs are append-only and cannot be updated");
  }

  async remove() {
    throw new Error("Audit logs are append-only and cannot be removed");
  }
}

export class InMemoryInventoryRepository extends InMemoryRepository {
  constructor() {
    super((props) => new Item(props), [["serialNumber"]], () => new DuplicateItemError());
  }

  async existsForEmployee(employeeId) {
    return [...this.items.values()].some((item) => item.assignedEmployeeId === employeeId);
  }

  async findAvailable() {
    return [...this.items.values()].filter((item) => item.status === "available" && item.isActive !== false);
  }

  async findHeldBy(employeeId) {
    return [...this.items.values()].filter(
      (item) => item.status === "in_use" && item.assignedEmployeeId === employeeId
    );
  }

  async claim(itemId, employeeId) {
    const item = this.items.get(itemId);
    if (!item || item.status !== "available" || item.isActive === false) return null;
    return this.update(itemId, { status: "in_use", assignedEmployeeId: employeeId });
  }

  async release(itemId, employeeId) {
    const item = this.items.get(itemId);
    if (!item || item.status !== "in_use" || item.assignedEmployeeId !== employeeId) return null;
    return this.update(itemId, { status: "available", assignedEmployeeId: undefined });
  }
}

export class InMemoryBorrowingRepository extends InMemoryRepository {
  constructor() {
    super((props) => new Borrowing(props), [], () => new Error("duplicate"));
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()].filter((b) => b.employeeId === employeeId).reverse();
  }

  async markReturned(itemId, employeeId) {
    const open = [...this.items.values()]
      .reverse()
      .find((b) => b.itemId === itemId && b.employeeId === employeeId && !b.returnedAt);
    return open ? this.update(open.id, { returnedAt: new Date() }) : null;
  }
}

export class InMemoryAttendanceRepository extends InMemoryRepository {
  constructor() {
    super((props) => new Attendance(props), [["employeeId", "date"]], () => new Error("duplicate"));
  }

  async findByEmployeeAndDate(employeeId, date) {
    return [...this.items.values()].find((a) => a.employeeId === employeeId && a.date === date) ?? null;
  }

  async findOpenByEmployeeId(employeeId) {
    return [...this.items.values()].reverse().find((a) => a.employeeId === employeeId && !a.timeOut) ?? null;
  }
}

export class InMemorySalaryRateRepository extends InMemoryRepository {
  constructor() {
    super((props) => new SalaryRate(props), [], () => new Error("duplicate"));
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()]
      .filter((r) => r.employeeId === employeeId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  async findEffective(employeeId, day) {
    // Ties go to the newest assignment, which is the last one stored.
    return (
      [...this.items.values()]
        .filter((r) => r.employeeId === employeeId && r.effectiveFrom <= day)
        .reverse()
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
    );
  }
}

/** Mirrors the Mongo repository: a soft-deleted shift is invisible except to findByIdIncludingDeleted. */
export class InMemoryWorkShiftRepository extends InMemoryRepository {
  constructor() {
    super((props) => new WorkShift(props), [], () => new DuplicateShiftError());
  }

  #live() {
    return [...this.items.values()].filter((shift) => !shift.deletedAt);
  }

  async findAll() {
    return this.#live();
  }

  async findPage({ page, pageSize }) {
    const live = this.#live();
    return { items: live.slice((page - 1) * pageSize, page * pageSize), total: live.length };
  }

  async findById(id) {
    const shift = this.items.get(id);
    return shift && !shift.deletedAt ? shift : null;
  }

  async update(id, data) {
    return (await this.findById(id)) ? super.update(id, data) : null;
  }

  async findByName(name) {
    return this.#live().find((shift) => nameKey(shift.name) === nameKey(name)) ?? null;
  }

  async findByScheduleKey(key) {
    return this.#live().find((shift) => scheduleKey(shift) === key) ?? null;
  }

  async findByIdIncludingDeleted(id) {
    return this.items.get(id) ?? null;
  }

  async softDelete(id) {
    const shift = await this.findById(id);
    if (!shift) return false;
    this.items.set(id, new WorkShift({ ...shift, deletedAt: new Date(), isActive: false }));
    return true;
  }
}

export class InMemoryShiftAssignmentRepository extends InMemoryRepository {
  constructor() {
    super((props) => new ShiftAssignment(props), [], () => new Error("duplicate"));
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()]
      .filter((a) => a.employeeId === employeeId)
      .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  }

  async findEffective(employeeId, day) {
    // Ties go to the newest assignment, which is the last one stored.
    return (
      [...this.items.values()]
        .filter((a) => a.employeeId === employeeId && a.effectiveFrom <= day)
        .reverse()
        .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0] ?? null
    );
  }

  async existsForShift(shiftId) {
    return [...this.items.values()].some((a) => a.shiftId === shiftId);
  }
}

export class InMemoryDocumentRequirementRepository extends InMemoryRepository {
  constructor() {
    super((props) => new DocumentRequirement(props), [], () => new DuplicateDocumentRequirementError());
  }

  async findByName(name) {
    return [...this.items.values()].find((r) => requirementNameKey(r.name) === requirementNameKey(name)) ?? null;
  }

  async findActive() {
    return [...this.items.values()].filter((r) => r.isActive !== false);
  }
}

export class InMemoryEmployeeDocumentRepository extends InMemoryRepository {
  constructor() {
    super((props) => new EmployeeDocument(props), [["employeeId", "requirementId"]], () => new DuplicateEmployeeDocumentError());
  }

  async findByEmployeeId(employeeId) {
    return [...this.items.values()].filter((d) => d.employeeId === employeeId);
  }

  async findByEmployeeAndRequirement(employeeId, requirementId) {
    return [...this.items.values()].find((d) => d.employeeId === employeeId && d.requirementId === requirementId) ?? null;
  }

  async existsForRequirement(requirementId) {
    return [...this.items.values()].some((d) => d.requirementId === requirementId);
  }
}
