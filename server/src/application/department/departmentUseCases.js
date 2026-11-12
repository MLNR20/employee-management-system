import { createCrudUseCases } from "../shared/crudUseCases.js";
import {
  assertValidDepartment,
  pickDepartmentFields,
} from "../../domain/department/departmentRules.js";

/** @param {{departmentRepository: import("../../domain/department/DepartmentRepository").DepartmentRepository}} deps */
export const createDepartmentUseCases = ({ departmentRepository }) => {
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
    deleteDepartment: crud.remove,
  };
};
