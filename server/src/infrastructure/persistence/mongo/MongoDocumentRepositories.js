import mongoose from "mongoose";
import { MongoRepository } from "./MongoRepository.js";
import { DocumentRequirement } from "../../../domain/document/DocumentRequirement.js";
import { EmployeeDocument } from "../../../domain/document/EmployeeDocument.js";
import { requirementNameKey } from "../../../domain/document/documentRules.js";
import { DuplicateDocumentRequirementError, DuplicateEmployeeDocumentError } from "../../../domain/errors.js";
import { DocumentRequirementModel, EmployeeDocumentModel } from "./models/documentModels.js";
import { toBaseProps } from "./models/baseSchema.js";

const toRequirement = (doc) =>
  new DocumentRequirement({
    ...toBaseProps(doc),
    name: doc.name,
    description: doc.description ?? "",
    isRequired: doc.isRequired,
    hasExpiry: doc.hasExpiry,
  });

const toEmployeeDocument = (doc) =>
  new EmployeeDocument({
    ...toBaseProps(doc),
    employeeId: String(doc.employeeId),
    requirementId: String(doc.requirementId),
    status: doc.status,
    receivedAt: doc.receivedAt ?? null,
    expiryDate: doc.expiryDate ?? null,
    reviewedBy: doc.reviewedBy ? String(doc.reviewedBy) : null,
    reviewedAt: doc.reviewedAt ?? null,
    remarks: doc.remarks ?? "",
  });

const withKey = (data) => (data.name !== undefined ? { ...data, nameKey: requirementNameKey(data.name) } : data);

export class MongoDocumentRequirementRepository extends MongoRepository {
  constructor() {
    super({
      model: DocumentRequirementModel,
      toEntity: toRequirement,
      searchFields: ["name", "description"],
      duplicateError: () => new DuplicateDocumentRequirementError(),
    });
  }

  create(data) {
    return super.create(withKey(data));
  }

  update(id, data) {
    return super.update(id, withKey(data));
  }

  async findByName(name) {
    const doc = await DocumentRequirementModel.findOne({ nameKey: requirementNameKey(name) }).lean();
    return doc ? toRequirement(doc) : null;
  }

  async findActive() {
    const docs = await DocumentRequirementModel.find({ isActive: { $ne: false } }).sort({ createdAt: 1, _id: 1 }).lean();
    return docs.map(toRequirement);
  }
}

export class MongoEmployeeDocumentRepository extends MongoRepository {
  constructor() {
    super({
      model: EmployeeDocumentModel,
      toEntity: toEmployeeDocument,
      searchFields: ["status", "remarks"],
      duplicateError: () => new DuplicateEmployeeDocumentError(),
    });
  }

  async findByEmployeeId(employeeId) {
    if (!mongoose.isValidObjectId(employeeId)) return [];
    const docs = await EmployeeDocumentModel.find({ employeeId }).lean();
    return docs.map(toEmployeeDocument);
  }

  async findByEmployeeAndRequirement(employeeId, requirementId) {
    if (!mongoose.isValidObjectId(employeeId) || !mongoose.isValidObjectId(requirementId)) return null;
    const doc = await EmployeeDocumentModel.findOne({ employeeId, requirementId }).lean();
    return doc ? toEmployeeDocument(doc) : null;
  }

  async existsForRequirement(requirementId) {
    if (!mongoose.isValidObjectId(requirementId)) return false;
    return Boolean(await EmployeeDocumentModel.exists({ requirementId }));
  }
}
