import { Entity, baseProps } from "../Entity";

export class Employee extends Entity {
  constructor({
    first_name,
    last_name,
    email,
    position,
    department,
    salary,
    hireDate,
    sssNumber,
    tinNumber,
    philhealthNumber,
    pagibigNumber,
    managerId = null,
    ...base
  } = {}) {
    super(base);
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
    this.position = position;
    this.department = department;
    this.salary = salary;
    this.hireDate = hireDate;
    this.sssNumber = sssNumber;
    this.tinNumber = tinNumber;
    this.philhealthNumber = philhealthNumber;
    this.pagibigNumber = pagibigNumber;
    this.managerId = managerId; // id of the employee this one reports to, or null
  }

  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  /** Builds an Employee from an API payload. */
  static fromApi(raw = {}) {
    return new Employee({
      ...baseProps(raw),
      first_name: raw.first_name,
      last_name: raw.last_name,
      email: raw.email,
      position: raw.position,
      department: raw.department,
      salary: raw.salary,
      hireDate: raw.hireDate,
      sssNumber: raw.sssNumber,
      tinNumber: raw.tinNumber,
      philhealthNumber: raw.philhealthNumber,
      pagibigNumber: raw.pagibigNumber,
      managerId: raw.managerId ?? null,
    });
  }
}
