import mongoose from "mongoose";
import { createEntitySchema } from "./baseSchema.js";
import { ItemStatus } from "../../../../domain/inventory/Item.js";

const itemsSchema = createEntitySchema({
  name: { type: String, required: true, trim: true },
  serialNumber: { type: String, required: true, unique: true, trim: true },
  category: { type: String, trim: true, default: "" },
  status: { type: String, enum: Object.values(ItemStatus), default: ItemStatus.AVAILABLE },
  location: { type: String, trim: true, default: "" },
  assignedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: "employees", default: null },
  purchaseDate: { type: Date, default: null },
  purchaseCost: { type: Number, min: 0, default: null },
  notes: { type: String, trim: true, default: "" },
});

export const ItemModel = mongoose.model("items", itemsSchema);
