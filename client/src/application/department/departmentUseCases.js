import { createCrudUseCases } from "../shared/crudUseCases";

export const createDepartmentUseCases = (departmentRepository) => createCrudUseCases(departmentRepository);
