import mongoose from "mongoose";
import { AdministratorRepository } from "../../../domain/administrator/AdministratorRepository.js";
import { Administrator } from "../../../domain/administrator/Administrator.js";
import { DuplicateAdministratorError } from "../../../domain/errors.js";
import { AdministratorModel } from "./models/administratorModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const DUPLICATE_KEY = 11000;

const toAdministrator = (doc) =>
  doc &&
  new Administrator({
    ...toBaseProps(doc),
    username: doc.username,
    first_name: doc.first_name,
    last_name: doc.last_name,
    email: doc.email,
    passwordHash: doc.password,
  });

export class MongoAdministratorRepository extends AdministratorRepository {
  async findById(id) {
    if (!mongoose.isValidObjectId(id)) return null;
    return toAdministrator(await AdministratorModel.findById(id).lean());
  }

  async findByUsername(username) {
    return toAdministrator(await AdministratorModel.findOne({ username }).lean());
  }

  async findAll() {
    const docs = await AdministratorModel.find({}).lean();
    return docs.map(toAdministrator);
  }

  count() {
    return AdministratorModel.countDocuments();
  }

  async create({ username, first_name, last_name, email, passwordHash }) {
    try {
      const doc = await AdministratorModel.create({
        username,
        first_name,
        last_name,
        email,
        password: passwordHash,
      });
      return toAdministrator(doc.toObject());
    } catch (error) {
      if (error.code === DUPLICATE_KEY) throw new DuplicateAdministratorError();
      throw error;
    }
  }

  async setRefreshTokenHash(id, hash) {
    if (!mongoose.isValidObjectId(id)) return;
    await AdministratorModel.updateOne({ _id: id }, { refreshTokenHash: hash });
  }

  async rotateRefreshTokenHash(id, expectedHash, newHash) {
    if (!mongoose.isValidObjectId(id)) return false;

    // Filtering on the expected hash makes this a single atomic compare-and-swap,
    // so two parallel refreshes with the same token cannot both succeed.
    const result = await AdministratorModel.updateOne(
      { _id: id, refreshTokenHash: expectedHash },
      { refreshTokenHash: newHash }
    );
    return result.modifiedCount === 1;
  }
}
