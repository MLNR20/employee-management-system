import { Entity, baseProps } from "../Entity";

export class Role extends Entity {
  constructor({ name, description, permissions = [], ...base } = {}) {
    super(base);
    this.name = name;
    this.description = description;
    this.permissions = permissions; // "<module>:<action>" keys, see the permission catalog
  }

  static fromApi(raw = {}) {
    return new Role({
      ...baseProps(raw),
      name: raw.name,
      description: raw.description,
      permissions: raw.permissions ?? [],
    });
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

export const permissionKey = (module, action) => `${module}:${action}`;
