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
import {
  assertValidEmployeeDocument,
  assertValidRequirement,
  checklistState,
  pickEmployeeDocumentFields,
  pickRequirementFields,
} from "../../domain/document/documentRules.js";

const REQUIREMENT_FIELDS = ["name", "description", "isRequired", "hasExpiry"];
const DOCUMENT_FIELDS = ["employeeId", "requirementId", "status", "receivedAt", "expiryDate", "remarks"];

/**
 * The checklist of documents a new hire must hand in. Every line is unique by name, and a line that
 * employees already have documents for cannot be deleted (mark it inactive instead).
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
      return crud.update(id, merged);
    },

    async deleteRequirement(id) {
      if (await employeeDocumentRepository.existsForRequirement(id)) throw new DocumentRequirementInUseError();
      return crud.remove(id);
    },

    /** Creates the standard checklist on a fresh install, when there are no requirements at all. */
    async ensureDefaultRequirements() {
      if ((await documentRequirementRepository.findAll()).length > 0) return { created: 0 };
      for (const requirement of DEFAULT_REQUIREMENTS) await documentRequirementRepository.create(requirement);
      return { created: DEFAULT_REQUIREMENTS.length };
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
 * @param {number} [deps.utcOffsetMinutes] the workplace clock, used for "today" when checking expiry
 * @param {() => Date} [deps.now]
 */
export const createEmployeeDocumentUseCases = ({
  employeeDocumentRepository,
  documentRequirementRepository,
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

  const review = async (id, reviewerId, changes) =>
    employeeDocumentRepository.update(id, { ...changes, reviewedBy: reviewerId, reviewedAt: now() });

  return {
    listEmployeeDocuments: crud.list,
    listEmployeeDocumentsPage: crud.listPage,
    getEmployeeDocument: crud.get,
    deleteEmployeeDocument: crud.remove,

    /** Records that an employee has handed in (or is expected to hand in) a document. */
    async addEmployeeDocument(input = {}) {
      assertValidEmployeeDocument(input);

      const employee = await findEmployee(input.employeeId);
      if (employee.isActive === false) throw new NotFoundError("Employee not found");

      const requirement = await documentRequirementRepository.findById(input.requirementId);
      if (!requirement || requirement.isActive === false) {
        throw new ValidationError("That document requirement does not exist or is not active");
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

    /**
     * The employee's onboarding checklist: one line for every active requirement with what they have
     * handed in (or none), plus the counts. It is complete when every required line is verified.
     */
    async checklist(employeeId) {
      await findEmployee(employeeId);

      const [requirements, documents] = await Promise.all([
        documentRequirementRepository.findActive(),
        employeeDocumentRepository.findByEmployeeId(employeeId),
      ]);
      const today = localDay(now(), utcOffsetMinutes);

      const items = requirements.map((requirement) => {
        const document = documents.find((d) => d.requirementId === requirement.id) ?? null;
        return { requirement, document, state: checklistState(document, today) };
      });

      const count = (state, only = () => true) => items.filter((i) => i.state === state && only(i)).length;
      const required = items.filter((i) => i.requirement.isRequired);

      return {
        employeeId,
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
