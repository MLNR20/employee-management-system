import { Entity, baseProps } from "../Entity";

export class Employee extends Entity {
  constructor({
    employmentCode = "",
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
    employmentTypeId = null,
    rehireStatus = "",
    separation = null,
    ...base
  } = {}) {
    super(base);
    this.employmentCode = employmentCode;
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
    this.employmentTypeId = employmentTypeId; // id of the employee's EmploymentType, or null
    this.rehireStatus = rehireStatus; // "rehireable", "non_rehireable" or "" (not tagged)
    this.separation = separation; // the current offboarding, or null
  }

  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  /** Builds an Employee from an API payload. */
  static fromApi(raw = {}) {
    return new Employee({
      ...baseProps(raw),
      employmentCode: raw.employmentCode ?? "",
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
      employmentTypeId: raw.employmentTypeId ?? null,
      rehireStatus: raw.rehireStatus ?? "",
      separation: raw.separation ?? null,
    });
  }
}
