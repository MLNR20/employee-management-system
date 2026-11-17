import { createCrudUseCases } from "../shared/crudUseCases.js";
import { DuplicateEmploymentTypeError, NotFoundError } from "../../domain/errors.js";
import {
  assertValidEmploymentType,
  pickEmploymentTypeFields,
} from "../../domain/employmentType/employmentTypeRules.js";

/**
 * Employment types. No two live types share a name (ignoring case). Deleting is a soft delete: the type
 * leaves every list and can no longer be assigned, its name becomes free again, and employees who
 * already hold it keep it.
 *
 * @param {Object} deps
 * @param {import("../../domain/employmentType/EmploymentTypeRepository").EmploymentTypeRepository} deps.employmentTypeRepository
 */
export const createEmploymentTypeUseCases = ({ employmentTypeRepository }) => {
  const crud = createCrudUseCases({
    repository: employmentTypeRepository,
    entityName: "Employment type",
    validate: assertValidEmploymentType,
    pickFields: pickEmploymentTypeFields,
  });

  const assertUnique = async (name, exceptId) => {
    const same = await employmentTypeRepository.findByName(name);
    if (same && same.id !== exceptId) {
      throw new DuplicateEmploymentTypeError(`An employment type named "${same.name}" already exists`);
    }
  };

  return {
    listEmploymentTypes: crud.list,
    listEmploymentTypesPage: crud.listPage,
    getEmploymentType: crud.get,

    async addEmploymentType(input = {}) {
      assertValidEmploymentType(input);
      await assertUnique(input.name);
      return crud.add(input);
    },

    async updateEmploymentType(id, input = {}) {
      assertValidEmploymentType(input);
      await assertUnique(input.name, id);
      return crud.update(id, input);
    },

    /** Soft delete. A type that is already deleted (or never existed) is reported as not found. */
    async deleteEmploymentType(id) {
      if (!(await employmentTypeRepository.softDelete(id))) throw new NotFoundError("Employment type not found");
    },
  };
};
