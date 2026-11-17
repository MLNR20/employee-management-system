import { Entity, baseProps } from "../Entity";

/** How an employee is employed: Regular, Probationary, Contractual, Part-time and so on. */
export class EmploymentType extends Entity {
  constructor({ name, description, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
  }

  static fromApi(raw = {}) {
    return new EmploymentType({
      ...baseProps(raw),
      name: raw.name,
      description: raw.description,
    });
  }
}
