import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { SalaryRate } from "../../../domain/salary/SalaryRate.js";
import { SalaryRateModel } from "./models/salaryRateModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toSalaryRate = (doc) =>
  new SalaryRate({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    hourlyRate: doc.hourlyRate,
    effectiveFrom: doc.effectiveFrom,
    assignedBy: String(doc.assignedBy),
    remarks: doc.remarks ?? "",
  });

export class MongoSalaryRateRepository extends MongoRepository {
  constructor() {
    super({ model: SalaryRateModel, toEntity: toSalaryRate, searchFields: ["effectiveFrom", "remarks"] });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await SalaryRateModel.find({ employeeId }).sort({ effectiveFrom: -1, createdAt: -1 }).lean();
    return docs.map(toSalaryRate);
  }

  async findEffective(employeeId, day) {
    if (!mongoose.isValidObjectId(employeeId)) return null;
    // The newest assignment wins when two start on the same day.
    const doc = await SalaryRateModel.findOne({ employeeId, effectiveFrom: { $lte: day } })
      .sort({ effectiveFrom: -1, createdAt: -1 })
      .lean();
    return doc ? toSalaryRate(doc) : null;
  }
}
