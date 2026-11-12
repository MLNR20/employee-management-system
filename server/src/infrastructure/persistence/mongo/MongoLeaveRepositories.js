import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { LeaveBalance } from "../../../domain/leave/LeaveBalance.js";
import { LeaveRequest } from "../../../domain/leave/LeaveRequest.js";
import { LeaveApproval } from "../../../domain/leave/LeaveApproval.js";
import { DuplicateLeaveBalanceError } from "../../../domain/errors.js";
import { LeaveBalanceModel, LeaveRequestModel, LeaveApprovalModel } from "./models/leaveModels.js";
import { toBaseProps } from "./models/baseSchema.js";

const isValid = (...ids) => ids.every((id) => mongoose.isValidObjectId(id));

const toLeaveBalance = (doc) =>
  new LeaveBalance({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    leaveTypeId: String(doc.leaveTypeId),
    maxLeaves: doc.maxLeaves,
    availableLeaves: doc.availableLeaves,
  });

const toLeaveRequest = (doc) =>
  new LeaveRequest({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    leaveTypeId: String(doc.leaveTypeId),
    startDate: doc.startDate,
    endDate: doc.endDate,
    days: doc.days,
    reason: doc.reason,
    status: doc.status,
  });

const toLeaveApproval = (doc) =>
  new LeaveApproval({
    ...toBaseProps(doc),
    leaveRequestId: String(doc.leaveRequestId),
    approverId: String(doc.approverId),
    decision: doc.decision,
    remarks: doc.remarks,
  });

export class MongoLeaveBalanceRepository extends MongoRepository {
  constructor() {
    super({
      model: LeaveBalanceModel,
      toEntity: toLeaveBalance,
      duplicateError: () => new DuplicateLeaveBalanceError(),
    });
  }

  async findByEmployeeId(employeeId) {
    if (!isValid(employeeId)) return [];
    const docs = await LeaveBalanceModel.find({ employeeId }).lean();
    return docs.map(toLeaveBalance);
  }

  async findByEmployeeAndType(employeeId, leaveTypeId) {
    if (!isValid(employeeId, leaveTypeId)) return null;
    const doc = await LeaveBalanceModel.findOne({ employeeId, leaveTypeId }).lean();
    return doc ? toLeaveBalance(doc) : null;
  }

  async deductAvailable(id, amount) {
    if (!isValid(id)) return null;
    // The filter and the decrement happen in one atomic step: no overspending under concurrency.
    const doc = await LeaveBalanceModel.findOneAndUpdate(
      { _id: id, availableLeaves: { $gte: amount } },
      { $inc: { availableLeaves: -amount } },
      { new: true }
    ).lean();
    return doc ? toLeaveBalance(doc) : null;
  }

  async restoreAvailable(id, amount) {
    if (!isValid(id)) return;
    await LeaveBalanceModel.updateOne({ _id: id }, { $inc: { availableLeaves: amount } });
  }

  async existsForLeaveType(leaveTypeId) {
    if (!isValid(leaveTypeId)) return false;
    return Boolean(await LeaveBalanceModel.exists({ leaveTypeId }));
  }

  async removeForEmployee(employeeId) {
    if (!isValid(employeeId)) return;
    await LeaveBalanceModel.deleteMany({ employeeId });
  }
}

export class MongoLeaveRequestRepository extends MongoRepository {
  constructor() {
    super({ model: LeaveRequestModel, toEntity: toLeaveRequest, searchFields: ["reason", "status"] });
  }

  async findByEmployeeId(employeeId) {
    if (!isValid(employeeId)) return [];
    const docs = await LeaveRequestModel.find({ employeeId }).lean();
    return docs.map(toLeaveRequest);
  }

  async transitionStatus(id, from, to) {
    if (!isValid(id)) return null;
    // Matching on the current status makes the change atomic: only one caller can win.
    const doc = await LeaveRequestModel.findOneAndUpdate(
      { _id: id, status: from },
      { status: to },
      { new: true }
    ).lean();
    return doc ? toLeaveRequest(doc) : null;
  }

  async existsForLeaveType(leaveTypeId) {
    if (!isValid(leaveTypeId)) return false;
    return Boolean(await LeaveRequestModel.exists({ leaveTypeId }));
  }
}

export class MongoLeaveApprovalRepository extends MongoRepository {
  constructor() {
    super({ model: LeaveApprovalModel, toEntity: toLeaveApproval });
  }

  async findByLeaveRequestId(leaveRequestId) {
    if (!isValid(leaveRequestId)) return [];
    const docs = await LeaveApprovalModel.find({ leaveRequestId }).sort({ createdAt: 1 }).lean();
    return docs.map(toLeaveApproval);
  }
}
