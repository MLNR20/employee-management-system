import { Entity, baseProps } from "../Entity";

/** Someone to call in an emergency. One employee has many; each belongs to one employee. */
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

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  static fromApi(raw = {}) {
    return new EmergencyContact({
      ...baseProps(raw),
      employeeId: raw.employeeId,
      firstName: raw.firstName,
      lastName: raw.lastName,
      relationship: raw.relationship,
      email: raw.email,
      address: raw.address,
      phoneNumber: raw.phoneNumber,
    });
  }
}
