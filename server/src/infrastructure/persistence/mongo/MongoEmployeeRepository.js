import { MongoRepository } from "./MongoRepository.js";
import { Employee } from "../../../domain/employee/Employee.js";
import { DuplicateEmployeeError } from "../../../domain/errors.js";
import { EmployeeModel } from "./models/employeeModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toEmployee = (doc) =>
  new Employee({
    ...toBaseProps(doc),
    first_name: doc.first_name,
    last_name: doc.last_name,
    email: doc.email,
    position: doc.position,
    department: doc.department,
    salary: doc.salary,
    hireDate: doc.hireDate,
  });

export class MongoEmployeeRepository extends MongoRepository {
  constructor() {
    super({
      model: EmployeeModel,
      toEntity: toEmployee,
      duplicateError: () => new DuplicateEmployeeError(),
    });
  }
}
