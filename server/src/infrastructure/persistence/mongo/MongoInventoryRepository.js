import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Item, ItemStatus } from "../../../domain/inventory/Item.js";
import { DuplicateItemError } from "../../../domain/errors.js";
import { ItemModel } from "./models/itemModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toItem = (doc) =>
  new Item({
    ...toBaseProps(doc),
    name: doc.name,
    serialNumber: doc.serialNumber,
    category: doc.category,
    status: doc.status,
    location: doc.location,
    assignedEmployeeId: doc.assignedEmployeeId ? String(doc.assignedEmployeeId) : undefined,
    purchaseDate: doc.purchaseDate ?? undefined,
    purchaseCost: doc.purchaseCost ?? undefined,
    notes: doc.notes,
  });

export class MongoInventoryRepository extends MongoRepository {
  constructor() {
    super({
      model: ItemModel,
      toEntity: toItem,
      duplicateError: () => new DuplicateItemError(),
      searchFields: ["name", "serialNumber", "category", "location", "status"],
    });
  }

  async existsForEmployee(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return false;
    return Boolean(await ItemModel.exists({ assignedEmployeeId: employeeId }));
  }

  async findAvailable() {
    const docs = await ItemModel.find({ status: ItemStatus.AVAILABLE, isActive: { $ne: false } })
      .sort({ name: 1 })
      .lean();
    return docs.map(toItem);
  }

  async findHeldBy(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await ItemModel.find({ status: ItemStatus.IN_USE, assignedEmployeeId: employeeId })
      .sort({ name: 1 })
      .lean();
    return docs.map(toItem);
  }

  async claim(itemId, employeeId) {
    if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(employeeId)) return null;
    // The filter and the change are one operation: only one of two simultaneous claims can match.
    const doc = await ItemModel.findOneAndUpdate(
      { _id: itemId, status: ItemStatus.AVAILABLE, isActive: { $ne: false } },
      { status: ItemStatus.IN_USE, assignedEmployeeId: employeeId },
      { new: true }
    ).lean();
    return doc ? toItem(doc) : null;
  }

  async release(itemId, employeeId) {
    if (!mongoose.isValidObjectId(itemId) || !mongoose.isValidObjectId(employeeId)) return null;
    const doc = await ItemModel.findOneAndUpdate(
      { _id: itemId, status: ItemStatus.IN_USE, assignedEmployeeId: employeeId },
      { status: ItemStatus.AVAILABLE, assignedEmployeeId: null },
      { new: true }
    ).lean();
    return doc ? toItem(doc) : null;
  }
}
