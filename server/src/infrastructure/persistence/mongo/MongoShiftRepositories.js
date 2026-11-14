import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { WorkShift } from "../../../domain/shift/WorkShift.js";
import { ShiftAssignment } from "../../../domain/shift/ShiftAssignment.js";
import { nameKey, scheduleKey } from "../../../domain/shift/shiftRules.js";
import { DuplicateShiftError } from "../../../domain/errors.js";
import { WorkShiftModel, ShiftAssignmentModel } from "./models/workShiftModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toWorkShift = (doc) =>
  new WorkShift({
    ...toBaseProps(doc),
    name: doc.name,
    startTime: doc.startTime,
    endTime: doc.endTime,
    lunchMinutes: doc.lunchMinutes,
    graceMinutes: doc.graceMinutes,
    workDays: [...(doc.workDays ?? [])],
    deletedAt: doc.deletedAt ?? null,
  });

const toShiftAssignment = (doc) =>
  new ShiftAssignment({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    shiftId: String(doc.shiftId),
    effectiveFrom: doc.effectiveFrom,
    assignedBy: String(doc.assignedBy),
  });

const LIVE = { deletedAt: null };

/** Adds the uniqueness keys whenever a write carries the fields they are made from. */
const withKeys = (data) =>
  data.name !== undefined && data.startTime !== undefined && data.endTime !== undefined
    ? { ...data, nameKey: nameKey(data.name), scheduleKey: scheduleKey(data) }
    : data;

export class MongoWorkShiftRepository extends MongoRepository {
  constructor() {
    super({
      model: WorkShiftModel,
      toEntity: toWorkShift,
      searchFields: ["name", "startTime", "endTime"],
      duplicateError: () => new DuplicateShiftError(),
      baseFilter: LIVE, // soft-deleted shifts are invisible to every inherited method
    });
  }

  create(data) {
    return super.create(withKeys(data));
  }

  update(id, data) {
    return super.update(id, withKeys(data));
  }

  async findByName(name) {
    const doc = await WorkShiftModel.findOne({ nameKey: nameKey(name), ...LIVE }).lean();
    return doc ? toWorkShift(doc) : null;
  }

  async findByScheduleKey(key) {
    const doc = await WorkShiftModel.findOne({ scheduleKey: key, ...LIVE }).lean();
    return doc ? toWorkShift(doc) : null;
  }

  async findByIdIncludingDeleted(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await WorkShiftModel.findById(id).lean();
    return doc ? toWorkShift(doc) : null;
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const doc = await WorkShiftModel.findOneAndUpdate(
      { _id: id, ...LIVE },
      { $set: { deletedAt: new Date(), isActive: false }, $unset: { nameKey: 1, scheduleKey: 1 } }
    ).lean();
    return Boolean(doc);
  }
}

export class MongoShiftAssignmentRepository extends MongoRepository {
  constructor() {
    super({ model: ShiftAssignmentModel, toEntity: toShiftAssignment, searchFields: ["effectiveFrom"] });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await ShiftAssignmentModel.find({ employeeId }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
    return docs.map(toShiftAssignment);
  }

  async findEffective(employeeId, day) {
    if (!mongoose.isValidObjectId(employeeId)) return null;
    // The newest assignment wins when two start on the same day.
    const doc = await ShiftAssignmentModel.findOne({ employeeId, effectiveFrom: { $lte: day } })
      .sort({ effectiveFrom: -1, createdAt: -1 })
      .lean();
    return doc ? toShiftAssignment(doc) : null;
  }

  async existsForShift(shiftId) {
    if (!mongoose.isValidObjectId(shiftId)) return false;
    return Boolean(await ShiftAssignmentModel.exists({ shiftId }));
  }
}
