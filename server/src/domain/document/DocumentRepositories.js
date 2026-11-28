import { Repository } from "../Repository.js";

/** @extends {Repository<import("./DocumentRequirement").DocumentRequirement>} */
export class DocumentRequirementRepository extends Repository {
  /** @returns {Promise<import("./DocumentRequirement").DocumentRequirement | null>} matched ignoring case */
  async findByName(name) {
    throw new Error("DocumentRequirementRepository.findByName not implemented");
  }

  /** @returns {Promise<import("./DocumentRequirement").DocumentRequirement[]>} requirements that are active */
  async findActive() {
    throw new Error("DocumentRequirementRepository.findActive not implemented");
  }
}

/** @extends {Repository<import("./EmployeeDocument").EmployeeDocument>} */
export class EmployeeDocumentRepository extends Repository {
  /** @returns {Promise<import("./EmployeeDocument").EmployeeDocument[]>} */
  async findByEmployeeId(employeeId) {
    throw new Error("EmployeeDocumentRepository.findByEmployeeId not implemented");
  }

  /** @returns {Promise<import("./EmployeeDocument").EmployeeDocument | null>} */
  async findByEmployeeAndRequirement(employeeId, requirementId) {
    throw new Error("EmployeeDocumentRepository.findByEmployeeAndRequirement not implemented");
  }

  /** @returns {Promise<boolean>} whether any employee has a record for this requirement */
  async existsForRequirement(requirementId) {
    throw new Error("EmployeeDocumentRepository.existsForRequirement not implemented");
  }

  async removeForEmployee(employeeId) {
    throw new Error("EmployeeDocumentRepository.removeForEmployee not implemented");
  }
}

/** The uploaded copies of documents, kept apart from the records so that listing them stays light. */
export class DocumentFileRepository {
  /**
   * @param {{employeeId: string, name: string, contentType: string, size: number, data: Buffer}} file
   * @returns {Promise<{id: string}>}
   */
  async save(file) {
    throw new Error("DocumentFileRepository.save not implemented");
  }

  /** @returns {Promise<{id: string, employeeId: string, name: string, contentType: string, size: number, data: Buffer} | null>} */
  async findById(id) {
    throw new Error("DocumentFileRepository.findById not implemented");
  }

  /** Takes a file out of use. It stays stored (soft delete). */
  async remove(id) {
    throw new Error("DocumentFileRepository.remove not implemented");
  }

  /** @returns {Promise<{count: number, bytes: number}>} the employee's files that have not been removed */
  async usage(employeeId) {
    throw new Error("DocumentFileRepository.usage not implemented");
  }

  /** @returns {Promise<number>} the bytes of every file stored, removed ones included */
  async totalBytes() {
    throw new Error("DocumentFileRepository.totalBytes not implemented");
  }

  async removeForEmployee(employeeId) {
    throw new Error("DocumentFileRepository.removeForEmployee not implemented");
  }
}
