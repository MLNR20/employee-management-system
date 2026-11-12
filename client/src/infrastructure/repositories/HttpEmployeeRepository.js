import { HttpRepository } from "../http/HttpRepository";
import { Employee } from "../../domain/employee/Employee";

export class HttpEmployeeRepository extends HttpRepository {
  constructor() {
    super({ resource: "employees", fromApi: Employee.fromApi });
  }
}
