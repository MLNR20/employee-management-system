import { Entity, baseProps } from "../Entity";

export class Role extends Entity {
  constructor({ name, description, ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
  }

  static fromApi(raw = {}) {
    return new Role({ ...baseProps(raw), name: raw.name, description: raw.description });
  }
}

/** Grants one Role to one Administrator. */
export class RoleAssignment extends Entity {
  constructor({ administratorId, roleId, ...base } = {}) {
    super(base);
    this.administratorId = administratorId;
    this.roleId = roleId;
  }

  static fromApi(raw = {}) {
    return new RoleAssignment({
      ...baseProps(raw),
      administratorId: raw.administratorId,
      roleId: raw.roleId,
    });
  }
}
