import { Entity } from "../Entity.js";

/**
 * Someone to call when something happens to an employee. One employee has many
 * emergency contacts; each contact belongs to exactly one employee.
 */
export class EmergencyContact extends Entity {
  constructor({ employeeId, firstName, lastName, relationship, email, address, phoneNumber, ...base } = {}) {
    super(base);
    this.employeeId = employeeId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.relationship = relationship;
    this.email = email;
    this.address = address;
    this.phoneNumber = phoneNumber;
  }
}
