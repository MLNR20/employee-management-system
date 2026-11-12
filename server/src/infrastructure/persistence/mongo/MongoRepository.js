import mongoose from "mongoose";
import { Repository } from "../../../domain/Repository.js";

const DUPLICATE_KEY = 11000;

/**
 * Generic MongoDB implementation of the Repository contract. A concrete
 * repository only says which model it uses, how a stored document becomes a
 * domain entity, and which domain error a duplicate key should raise.
 *
 * @template {import("../../../domain/Entity").Entity} T
 */
export class MongoRepository extends Repository {
  /**
   * @param {Object} options
   * @param {import("mongoose").Model} options.model
   * @param {(doc: object) => T} options.toEntity maps a lean document to an entity
   * @param {() => Error} [options.duplicateError] error raised on a unique-index violation
   */
  constructor({ model, toEntity, duplicateError }) {
    super();
    this.model = model;
    this.toEntity = toEntity;
    this.duplicateError = duplicateError;
  }

  async findAll() {
    const docs = await this.model.find({}).lean();
    return docs.map(this.toEntity);
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await this.model.findById(id).lean();
    return doc ? this.toEntity(doc) : null;
  }

  async create(data) {
    try {
      const doc = await this.model.create(data);
      return this.toEntity(doc.toObject());
    } catch (error) {
      this.#rethrow(error);
    }
  }

  async update(id, data) {
    if (!mongoose.isValidObjectId(id)) return null;
    try {
      const doc = await this.model
        .findByIdAndUpdate(id, data, { new: true, runValidators: true })
        .lean();
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      this.#rethrow(error);
    }
  }

  async remove(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return Boolean(await this.model.findByIdAndDelete(id));
  }

  #rethrow(error) {
    if (error.code === DUPLICATE_KEY && this.duplicateError) throw this.duplicateError();
    throw error;
  }
}
