import { Repository } from "../Repository.js";

/**
 * Deleted employment types are invisible to every inherited method (findAll, findPage, findById,
 * update...); only findByIdIncludingDeleted can still see them.
 * @extends {Repository<import("./EmploymentType").EmploymentType>}
 */
export class EmploymentTypeRepository extends Repository {
  /** @returns {Promise<import("./EmploymentType").EmploymentType | null>} the live type with this name (ignoring case) */
  async findByName(name) {
    throw new Error("EmploymentTypeRepository.findByName not implemented");
  }

  /** @returns {Promise<import("./EmploymentType").EmploymentType | null>} the type even when it was deleted */
  async findByIdIncludingDeleted(id) {
    throw new Error("EmploymentTypeRepository.findByIdIncludingDeleted not implemented");
  }

  /**
   * Soft delete: marks the type deleted and inactive and frees its name for reuse.
   * @returns {Promise<boolean>} false when there was no live type with that id
   */
  async softDelete(id) {
    throw new Error("EmploymentTypeRepository.softDelete not implemented");
  }
}
