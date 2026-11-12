import { createCrudUseCases } from "../shared/crudUseCases";

export const createEmployeeUseCases = (employeeRepository) => createCrudUseCases(employeeRepository);
