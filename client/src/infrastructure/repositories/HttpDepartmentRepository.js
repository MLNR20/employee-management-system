import { HttpRepository } from "../http/HttpRepository";
import { Department } from "../../domain/department/Department";

export class HttpDepartmentRepository extends HttpRepository {
  constructor() {
    super({ resource: "departments", fromApi: Department.fromApi });
  }
}
