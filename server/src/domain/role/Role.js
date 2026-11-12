import { Entity } from "../Entity.js";

export class Role extends Entity {
  constructor({ name, description, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
  }
}
