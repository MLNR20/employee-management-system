import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Item } from "../../../domain/inventory/Item.js";
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
}
