import { Entity } from "../Entity.js";

export class Department extends Entity {
  constructor({ name, code, description, ...base } = {}) {
    super(base);
    this.name = name;
    this.code = code;
    this.description = description;
  }
}
