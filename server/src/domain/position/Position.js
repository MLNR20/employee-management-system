import { Entity } from "../Entity.js";

/** A job title offered within one department. Employees store the title itself, as text. */
export class Position extends Entity {
  constructor({ name, departmentId, ...base } = {}) {
    super(base);
    this.name = name;
    this.departmentId = departmentId;
  }
}
