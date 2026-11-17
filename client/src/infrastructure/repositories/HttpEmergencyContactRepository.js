import { HttpRepository } from "../http/HttpRepository";
import { EmergencyContact } from "../../domain/employee/EmergencyContact";

export class HttpEmergencyContactRepository extends HttpRepository {
  constructor() {
    super({ resource: "emergency-contacts", fromApi: EmergencyContact.fromApi });
  }

  /** The emergency contacts of one employee, oldest first. */
  async getByEmployee(employeeId) {
    const { data } = await this.client.get(`/employees/${employeeId}/emergency-contacts`);
    return data.data.map(this.fromApi);
  }
}
