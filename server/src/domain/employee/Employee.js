import { Entity } from "../Entity.js";

export class Employee extends Entity {
  constructor({
    first_name,
    last_name,
    email,
    position,
    department,
    salary,
    hireDate,
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
  }
}
