import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { Position } from "../../../domain/position/Position.js";
import { DuplicatePositionError } from "../../../domain/errors.js";
import { PositionModel } from "./models/positionModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toPosition = (doc) =>
  new Position({ ...toBaseProps(doc), name: doc.name, departmentId: String(doc.departmentId) });

export class MongoPositionRepository extends MongoRepository {
  constructor() {
    super({
      model: PositionModel,
      toEntity: toPosition,
      searchFields: ["name"],
      duplicateError: () => new DuplicatePositionError(),
    });
  }

  async existsForDepartment(departmentId) {
    if (!mongoose.isValidObjectId(departmentId)) return false;
    return Boolean(await PositionModel.exists({ departmentId }));
  }
}
