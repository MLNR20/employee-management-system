import { createCrudUseCases } from "../shared/crudUseCases.js";
import { DepartmentInUseError } from "../../domain/errors.js";
import {
  assertValidDepartment,
  pickDepartmentFields,
} from "../../domain/department/departmentRules.js";

/**
 * @param {Object} deps
 * @param {import("../../domain/department/DepartmentRepository").DepartmentRepository} deps.departmentRepository
 * @param {import("../../domain/position/PositionRepository").PositionRepository} [deps.positionRepository]
 *   when given, a department with positions cannot be deleted
 */
export const createDepartmentUseCases = ({ departmentRepository, positionRepository }) => {
  const crud = createCrudUseCases({
    repository: departmentRepository,
    entityName: "Department",
    validate: assertValidDepartment,
    pickFields: pickDepartmentFields,
  });

  return {
    listDepartments: crud.list,
    listDepartmentsPage: crud.listPage,
    getDepartment: crud.get,
    addDepartment: crud.add,
    updateDepartment: crud.update,
    async deleteDepartment(id) {
      if (await positionRepository?.existsForDepartment(id)) throw new DepartmentInUseError();
      return crud.remove(id);
    },
  };
};
