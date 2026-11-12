import { Entity } from "../Entity.js";

/** Grants one Role to one Administrator. An administrator can hold many roles. */
export class RoleAssignment extends Entity {
  constructor({ administratorId, roleId, ...base } = {}) {
    super(base);
    this.administratorId = administratorId;
    this.roleId = roleId;
  }
}
