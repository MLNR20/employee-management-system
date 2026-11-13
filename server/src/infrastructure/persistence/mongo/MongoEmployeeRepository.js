import { MongoRepository } from "./MongoRepository.js";
import { Employee } from "../../../domain/employee/Employee.js";
import { DuplicateEmployeeError } from "../../../domain/errors.js";
import mongoose from "mongoose";
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
    sssNumber: doc.sssNumber,
    tinNumber: doc.tinNumber,
    philhealthNumber: doc.philhealthNumber,
    pagibigNumber: doc.pagibigNumber,
  });

export class MongoEmployeeRepository extends MongoRepository {
  constructor() {
    super({
      model: EmployeeModel,
      searchFields: ["first_name", "last_name", "email", "position", "department"],
      toEntity: toEmployee,
      duplicateError: () => new DuplicateEmployeeError(),
    });
  }

  async setPassword(id, passwordHash) {
    if (!mongoose.isValidObjectId(id)) return;
    await EmployeeModel.updateOne({ _id: id }, { passwordHash });
  }

  async findCredentialsByEmail(email) {
    const doc = await EmployeeModel.findOne({ email: String(email).trim().toLowerCase() })
      .select("+passwordHash")
      .lean();
    if (!doc) return null;
    return {
      id: String(doc._id),
      email: doc.email,
      first_name: doc.first_name,
      last_name: doc.last_name,
      isActive: doc.isActive !== false, // documents saved before the flag existed are active
      passwordHash: doc.passwordHash ?? "",
    };
  }
}
