import { createCrudUseCases } from "../shared/crudUseCases.js";
import {
  DocumentRequirementInUseError,
  DuplicateDocumentRequirementError,
  DuplicateEmployeeDocumentError,
  InvalidStateError,
  NotFoundError,
  ValidationError,
} from "../../domain/errors.js";
import { isMissing } from "../../domain/pickFields.js";
import { localDay } from "../../domain/attendance/localTime.js";
import { DocumentStatus } from "../../domain/document/EmployeeDocument.js";
import { DEFAULT_REQUIREMENTS } from "../../domain/document/defaultRequirements.js";
import { checkUpload } from "../../domain/document/fileRules.js";
import { DocumentStage } from "../../domain/document/DocumentRequirement.js";
import {
  assertValidEmployeeDocument,
  assertValidRequirement,
  assertValidStage,
  checklistState,
  pickEmployeeDocumentFields,
  pickRequirementFields,
} from "../../domain/document/documentRules.js";

const REQUIREMENT_FIELDS = ["name", "description", "isRequired", "hasExpiry", "stage"];
const DOCUMENT_FIELDS = ["employeeId", "requirementId", "status", "receivedAt", "expiryDate", "remarks"];

/**
 * The lines of the onboarding and offboarding document checklists. Every line is unique by name, and a
 * line that employees already have documents for cannot be deleted (mark it inactive instead) or moved
 * to the other checklist.
 *
 * @param {Object} deps
 * @param {import("../../domain/document/DocumentRepositories").DocumentRequirementRepository} deps.documentRequirementRepository
 * @param {import("../../domain/document/DocumentRepositories").EmployeeDocumentRepository} deps.employeeDocumentRepository
 */
export const createDocumentRequirementUseCases = ({ documentRequirementRepository, employeeDocumentRepository }) => {
  const crud = createCrudUseCases({
    repository: documentRequirementRepository,
    entityName: "Document requirement",
    validate: assertValidRequirement,
    pickFields: pickRequirementFields,
  });

  const assertUniqueName = async (name, exceptId) => {
    const same = await documentRequirementRepository.findByName(name);
    if (same && same.id !== exceptId) throw new DuplicateDocumentRequirementError(`"${same.name}" is already on the checklist`);
  };

  return {
    listRequirements: crud.list,
    listRequirementsPage: crud.listPage,
    getRequirement: crud.get,

    async addRequirement(input = {}) {
      assertValidRequirement(input);
      await assertUniqueName(input.name);
      return crud.add(input);
    },

    /** Fields that are left out keep their stored value. */
    async updateRequirement(id, input = {}) {
      const existing = await crud.get(id);
      const merged = { ...Object.fromEntries(REQUIREMENT_FIELDS.map((field) => [field, existing[field]])), ...input };

      assertValidRequirement(merged);
      await assertUniqueName(merged.name, id);
      if (merged.stage !== existing.stage && (await employeeDocumentRepository.existsForRequirement(id))) {
        throw new DocumentRequirementInUseError(
          "Employees have documents recorded for this requirement, so it cannot move to another checklist."
        );
      }
      return crud.update(id, merged);
    },

    async deleteRequirement(id) {
      if (await employeeDocumentRepository.existsForRequirement(id)) throw new DocumentRequirementInUseError();
      return crud.remove(id);
    },

    /**
     * Creates the standard checklist of every stage that has no requirements at all: both on a fresh
     * install, and the offboarding one on an install that predates it. A standard line whose name is
     * already taken is skipped.
     */
    async ensureDefaultRequirements() {
      const existing = await documentRequirementRepository.findAll();
      const stagesInUse = new Set(existing.map((requirement) => requirement.stage));

      let created = 0;
      for (const requirement of DEFAULT_REQUIREMENTS) {
        if (stagesInUse.has(requirement.stage)) continue;
        if (await documentRequirementRepository.findByName(requirement.name)) continue;
        await documentRequirementRepository.create(requirement);
        created++;
      }
      return { created };
    },
  };
};

/**
 * What each employee has handed in. A document is recorded as pending or received; only a review
 * (verify or reject) can mark it verified or rejected, and that records which administrator decided.
 *
 * @param {Object} deps
 * @param {import("../../domain/document/DocumentRepositories").EmployeeDocumentRepository} deps.employeeDocumentRepository
 * @param {import("../../domain/document/DocumentRepositories").DocumentRequirementRepository} deps.documentRequirementRepository
 * @param {import("../../domain/employee/EmployeeRepository").EmployeeRepository} deps.employeeRepository
 * @param {import("../../domain/document/DocumentRepositories").DocumentFileRepository} [deps.documentFileRepository]
 *   without it no files can be uploaded
 * @param {number} [deps.utcOffsetMinutes] the workplace clock, used for "today" when checking expiry
 * @param {() => Date} [deps.now]
 */
export const createEmployeeDocumentUseCases = ({
  employeeDocumentRepository,
  documentRequirementRepository,
  documentFileRepository,
  employeeRepository,
  utcOffsetMinutes = 0,
  now = () => new Date(),
}) => {
  const crud = createCrudUseCases({
    repository: employeeDocumentRepository,
    entityName: "Employee document",
    validate: assertValidEmployeeDocument,
    pickFields: pickEmployeeDocumentFields,
  });

  const findEmployee = async (employeeId) => {
    const employee = typeof employeeId === "string" ? await employeeRepository.findById(employeeId) : null;
    if (!employee) throw new NotFoundError("Employee not found");
    return employee;
  };

  /** The employee's records on one checklist, inactive requirements included. */
  const stageRecords = async (employeeId, stage) => {
    const [requirements, documents] = await Promise.all([
      documentRequirementRepository.findAll(),
      employeeDocumentRepository.findByEmployeeId(employeeId),
    ]);
    return documents
      .map((document) => ({ document, requirement: requirements.find((r) => r.id === document.requirementId) }))
      .filter(({ requirement }) => requirement?.stage === stage);
  };

  const removeStoredFile = async (file) => {
    if (file) await documentFileRepository?.remove(file.id);
  };

  const review = async (id, reviewerId, changes) =>
    employeeDocumentRepository.update(id, { ...changes, reviewedBy: reviewerId, reviewedAt: now() });

  return {
    listEmployeeDocuments: crud.list,
    listEmployeeDocumentsPage: crud.listPage,
    getEmployeeDocument: crud.get,
    /** Deletes a record along with its uploaded copy. */
    async deleteEmployeeDocument(id) {
      const document = await crud.get(id);
      await crud.remove(id);
      await removeStoredFile(document.file);
    },

    /**
     * Stores a scanned copy on a record, replacing any earlier one. A new copy counts as handed in and
     * has to be checked: the record becomes received and any earlier review is cleared.
     * @param {{name?: string, data?: Buffer}} upload
     */
    async attachFile(id, upload, administratorId) {
      if (!documentFileRepository) throw new ValidationError("File uploads are not enabled");
      const document = await crud.get(id);
      const file = checkUpload(upload);

      const stored = await documentFileRepository.save({ ...file, employeeId: document.employeeId });
      const { data, ...details } = file;
      let updated;
      try {
        updated = await employeeDocumentRepository.update(id, {
          file: { id: stored.id, ...details, uploadedBy: administratorId, uploadedAt: now() },
          status: DocumentStatus.RECEIVED,
          receivedAt: now(),
          reviewedBy: null,
          reviewedAt: null,
          remarks: "",
        });
      } catch (error) {
        await documentFileRepository.remove(stored.id); // never leave a file nothing points at
        throw error;
      }
      await removeStoredFile(document.file);
      return updated;
    },

    /** Takes the uploaded copy off a record. A verified record has to be checked again. */
    async removeFile(id) {
      const document = await crud.get(id);
      if (!document.file) throw new NotFoundError("This document has no file");

      const recheck =
        document.status === DocumentStatus.VERIFIED
          ? { status: DocumentStatus.RECEIVED, reviewedBy: null, reviewedAt: null }
          : {};
      const updated = await employeeDocumentRepository.update(id, { file: null, ...recheck });
      await removeStoredFile(document.file);
      return updated;
    },

    /** One uploaded copy, with its contents: a current one, or one kept from an earlier offboarding. */
    async getFile(fileId) {
      const file = await documentFileRepository?.findById(fileId);
      if (!file) throw new NotFoundError("File not found");
      return file;
    },

    /** Records that an employee has handed in (or is expected to hand in) a document. */
    async addEmployeeDocument(input = {}) {
      assertValidEmployeeDocument(input);

      const employee = await findEmployee(input.employeeId);

      const requirement = await documentRequirementRepository.findById(input.requirementId);
      const offboarding = requirement?.stage === DocumentStage.OFFBOARDING;
      // Offboarding documents are often collected after the employee has left; nothing else is.
      if (!offboarding && employee.isActive === false) throw new NotFoundError("Employee not found");
      if (!requirement || requirement.isActive === false) {
        throw new ValidationError("That document requirement does not exist or is not active");
      }
      if (offboarding && !employee.separation) {
        throw new InvalidStateError("Start this employee's offboarding first");
      }

      if (await employeeDocumentRepository.findByEmployeeAndRequirement(input.employeeId, input.requirementId)) {
        throw new DuplicateEmployeeDocumentError();
      }

      const status = isMissing(input.status) ? DocumentStatus.RECEIVED : input.status;
      const receivedAt = status === DocumentStatus.RECEIVED && isMissing(input.receivedAt) ? now() : input.receivedAt;
      return crud.add({ ...input, status, receivedAt });
    },

    /**
     * Corrects a record, or hands in a new copy after a rejection. Which employee and requirement it
     * belongs to cannot change. Setting a status clears the earlier review: it has to be checked again.
     */
    async updateEmployeeDocument(id, input = {}) {
      const existing = await crud.get(id);
      const { employeeId, requirementId, ...changes } = input;
      const merged = { ...Object.fromEntries(DOCUMENT_FIELDS.map((field) => [field, existing[field]])), ...changes };

      // Only a status sent now is checked: a verified record being edited keeps its verified status.
      assertValidEmployeeDocument({ ...merged, status: changes.status });

      const data = pickEmployeeDocumentFields(merged);
      if (!isMissing(changes.status)) {
        Object.assign(data, { reviewedBy: null, reviewedAt: null });
        if (changes.status === DocumentStatus.RECEIVED && !data.receivedAt) data.receivedAt = now();
      }
      return employeeDocumentRepository.update(id, data);
    },

    /** HR accepts a document that was handed in. A document with an expiry needs the date recorded first. */
    async verifyDocument(id, reviewerId) {
      const document = await crud.get(id);
      if (document.status !== DocumentStatus.RECEIVED) {
        throw new InvalidStateError(`Only a received document can be verified (this one is ${document.status})`);
      }

      const requirement = await documentRequirementRepository.findById(document.requirementId);
      if (requirement?.hasExpiry && !document.expiryDate) {
        throw new ValidationError("Record the expiry date before verifying this document");
      }
      return review(id, reviewerId, { status: DocumentStatus.VERIFIED });
    },

    /** HR turns a document down, with the reason, so the employee knows what to hand in again. */
    async rejectDocument(id, reviewerId, remarks) {
      const document = await crud.get(id);
      if (document.status !== DocumentStatus.RECEIVED && document.status !== DocumentStatus.VERIFIED) {
        throw new InvalidStateError(`Only a received or verified document can be rejected (this one is ${document.status})`);
      }
      if (typeof remarks !== "string" || remarks.trim() === "") {
        throw new ValidationError("Say why the document is rejected (remarks)");
      }
      return review(id, reviewerId, { status: DocumentStatus.REJECTED, remarks: remarks.trim() });
    },

    /** What is recorded on one checklist, by requirement name, to keep as history. */
    async snapshotStageDocuments(employeeId, stage) {
      const records = await stageRecords(employeeId, stage);
      return records.map(({ document, requirement }) => ({
        requirement: requirement.name,
        status: document.status,
        receivedAt: document.receivedAt,
        expiryDate: document.expiryDate,
        reviewedBy: document.reviewedBy,
        reviewedAt: document.reviewedAt,
        remarks: document.remarks,
        file: document.file,
      }));
    },

    /**
     * Clears one checklist of an employee. Their uploaded copies are deleted too, unless `keepFiles`
     * is set because a history entry still points at them.
     */
    async removeStageDocuments(employeeId, stage, { keepFiles = false } = {}) {
      for (const { document } of await stageRecords(employeeId, stage)) {
        await employeeDocumentRepository.remove(document.id);
        if (!keepFiles) await removeStoredFile(document.file);
      }
    },

    /**
     * One of the employee's checklists (onboarding unless another stage is asked for): one line for every
     * active requirement of that stage with what is recorded (or none), plus the counts. It is complete
     * when every required line is verified.
     */
    async checklist(employeeId, stage = DocumentStage.ONBOARDING) {
      assertValidStage(stage);
      await findEmployee(employeeId);

      const [active, documents] = await Promise.all([
        documentRequirementRepository.findActive(),
        employeeDocumentRepository.findByEmployeeId(employeeId),
      ]);
      const requirements = active.filter((requirement) => requirement.stage === stage);
      const today = localDay(now(), utcOffsetMinutes);

      const items = requirements.map((requirement) => {
        const document = documents.find((d) => d.requirementId === requirement.id) ?? null;
        return { requirement, document, state: checklistState(document, today) };
      });

      const count = (state, only = () => true) => items.filter((i) => i.state === state && only(i)).length;
      const required = items.filter((i) => i.requirement.isRequired);

      return {
        employeeId,
        stage,
        items,
        summary: {
          total: items.length,
          required: required.length,
          requiredVerified: count("verified", (i) => i.requirement.isRequired),
          received: count("received"),
          pending: count("pending"),
          rejected: count("rejected"),
          expired: count("expired"),
          missing: count("missing"),
          complete: required.length > 0 && required.every((i) => i.state === "verified"),
        },
      };
    },
  };
};
