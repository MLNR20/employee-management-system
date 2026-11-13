import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Borrowing } from "../../../domain/inventory/Borrowing.js";
import { BorrowingModel } from "./models/borrowingModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toBorrowing = (doc) =>
  new Borrowing({
    ...toBaseProps(doc),
    itemId: String(doc.itemId),
    employeeId: String(doc.employeeId),
    borrowedAt: doc.borrowedAt,
    returnedAt: doc.returnedAt ?? null,
  });

export class MongoBorrowingRepository extends MongoRepository {
  constructor() {
    super({ model: BorrowingModel, toEntity: toBorrowing });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await BorrowingModel.find({ employeeId }).sort({ borrowedAt: -1 }).lean();
    return docs.map(toBorrowing);
  }

  async markReturned(itemId, employeeId) {
    if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(employeeId)) return null;
    const doc = await BorrowingModel.findOneAndUpdate(
      { itemId, employeeId, returnedAt: null },
      { returnedAt: new Date() },
      { new: true, sort: { borrowedAt: -1 } }
    ).lean();
    return doc ? toBorrowing(doc) : null;
  }
}
