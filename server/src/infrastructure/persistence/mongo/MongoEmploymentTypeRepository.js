import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { EmploymentType } from "../../../domain/employmentType/EmploymentType.js";
import { employmentTypeNameKey } from "../../../domain/employmentType/employmentTypeRules.js";
import { DuplicateEmploymentTypeError } from "../../../domain/errors.js";
import { EmploymentTypeModel } from "./models/employmentTypeModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toEmploymentType = (doc) =>
  new EmploymentType({
    ...toBaseProps(doc),
    name: doc.name,
    description: doc.description,
    deletedAt: doc.deletedAt ?? null,
  });

const LIVE = { deletedAt: null };

/** Adds the uniqueness key whenever a write carries the name it is made from. */
const withKey = (data) => (data.name !== undefined ? { ...data, nameKey: employmentTypeNameKey(data.name) } : data);

export class MongoEmploymentTypeRepository extends MongoRepository {
  constructor() {
    super({
      model: EmploymentTypeModel,
      searchFields: ["name", "description"],
      toEntity: toEmploymentType,
      duplicateError: () => new DuplicateEmploymentTypeError(),
      baseFilter: LIVE, // deleted types are invisible to every inherited method
    });
  }

  create(data) {
    return super.create(withKey(data));
  }

  update(id, data) {
    return super.update(id, withKey(data));
  }

  async findByName(name) {
    const doc = await EmploymentTypeModel.findOne({ nameKey: employmentTypeNameKey(name), ...LIVE }).lean();
    return doc ? toEmploymentType(doc) : null;
  }

  async findByIdIncludingDeleted(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await EmploymentTypeModel.findById(id).lean();
    return doc ? toEmploymentType(doc) : null;
  }

  async softDelete(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    const doc = await EmploymentTypeModel.findOneAndUpdate(
      { _id: id, ...LIVE },
      { $set: { deletedAt: new Date(), isActive: false }, $unset: { nameKey: 1 } }
    ).lean();
    return Boolean(doc);
  }
}
