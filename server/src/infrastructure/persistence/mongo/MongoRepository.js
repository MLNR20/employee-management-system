import mongoose from "mongoose";
import { Repository } from "../../../domain/Repository.js";

const DUPLICATE_KEY = 11000;

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
   * @param {string[]} [options.searchFields] text fields a page search looks in (none: search is ignored)
   * @param {object} [options.baseFilter] a condition every read and write is limited to, e.g. { deletedAt: null }
   *   so that soft-deleted documents are invisible
   */
  constructor({ model, toEntity, duplicateError, searchFields = [], baseFilter = {} }) {
    super();
    this.model = model;
    this.toEntity = toEntity;
    this.duplicateError = duplicateError;
    this.searchFields = searchFields;
    this.baseFilter = baseFilter;
  }

  async findAll() {
    const docs = await this.model.find(this.baseFilter).lean();
    return docs.map(this.toEntity);
  }

  async findPage({ page, pageSize, search, sortBy, sortDir = 1 }) {
    const filter = { ...this.baseFilter, ...this.#searchFilter(search) };
    // Only real fields of the model can be sorted on; anything else falls back to newest first.
    const sort = sortBy && this.model.schema.path(sortBy) ? { [sortBy]: sortDir } : { createdAt: -1 };

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ ...sort, _id: 1 }) // _id keeps the order stable between pages when values tie
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.model.countDocuments(filter),
    ]);
    return { items: docs.map(this.toEntity), total };
  }

  async summary() {
    const [total, inactive] = await Promise.all([
      this.model.countDocuments(this.baseFilter),
      this.model.countDocuments({ ...this.baseFilter, isActive: false }), // documents saved before the flag existed count as active
    ]);
    return { total, active: total - inactive, inactive };
  }

  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    const doc = await this.model.findOne({ _id: id, ...this.baseFilter }).lean();
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
        .findOneAndUpdate({ _id: id, ...this.baseFilter }, data, { new: true, runValidators: true })
        .lean();
      return doc ? this.toEntity(doc) : null;
    } catch (error) {
      this.#rethrow(error);
    }
  }

  async remove(id) {
    if (!mongoose.isValidObjectId(id)) return false;
    return Boolean(await this.model.findOneAndDelete({ _id: id, ...this.baseFilter }));
  }

  #searchFilter(search) {
    if (!search || this.searchFields.length === 0) return {};
    const pattern = new RegExp(escapeRegExp(search), "i");
    return { $or: this.searchFields.map((field) => ({ [field]: pattern })) };
  }

  #rethrow(error) {
    if (error.code === DUPLICATE_KEY && this.duplicateError) throw this.duplicateError();
    throw error;
  }
}
