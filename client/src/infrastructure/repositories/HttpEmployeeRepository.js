import { HttpRepository } from "../http/HttpRepository";
import { Employee } from "../../domain/employee/Employee";

export class HttpEmployeeRepository extends HttpRepository {
  constructor() {
    super({ resource: "employees", fromApi: Employee.fromApi });
  }

  /** Headcount: { total, active, inactive }. */
  async getSummary() {
    const { data } = await this.client.get(`/${this.resource}/summary`);
    return data;
  }
}
