import { Entity } from "../Entity.js";

export class Role extends Entity {
  constructor({ name, description, permissions = [], ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.permissions = permissions;
  }
}
