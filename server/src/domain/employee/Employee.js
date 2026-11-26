import { Entity } from "../Entity.js";

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
    separationHistory = [],
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
    // The employee this one reports to (another employee), or null for someone at the top.
    this.managerId = managerId;
    // How this employee is employed (an EmploymentType id), or null when none has been assigned.
    this.employmentTypeId = employmentTypeId;
    // "rehireable" or "non_rehireable" (a RehireStatus) once tagged during offboarding, else "".
    this.rehireStatus = rehireStatus;
    // The current offboarding (see separationRules), or null for an employee who is not leaving.
    this.separation = separation;
    // Earlier offboardings of an employee who was rehired, oldest first.
    this.separationHistory = separationHistory;
  }
}
