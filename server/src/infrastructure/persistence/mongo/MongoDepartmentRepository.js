import { MongoRepository } from "./MongoRepository.js";
import { Department } from "../../../domain/department/Department.js";
import { DuplicateDepartmentError } from "../../../domain/errors.js";
import { DepartmentModel } from "./models/departmentModel.js";
import { toBaseProps } from "./models/baseSchema.js";

const toDepartment = (doc) =>
  new Department({
    ...toBaseProps(doc),
    name: doc.name,
    code: doc.code,
    description: doc.description,
  });

export class MongoDepartmentRepository extends MongoRepository {
  constructor() {
    super({
      model: DepartmentModel,
      searchFields: ["name", "code", "description"],
      toEntity: toDepartment,
      duplicateError: () => new DuplicateDepartmentError(),
    });
  }
}
