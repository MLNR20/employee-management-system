import { Entity, baseProps } from "../Entity";

/** A job title offered within one department. */
export class Position extends Entity {
  constructor({ name, departmentId, ...base } = {}) {
    super(base);
    this.name = name;
    this.departmentId = departmentId;
  }

  static fromApi(raw = {}) {
    return new Position({ ...baseProps(raw), name: raw.name, departmentId: raw.departmentId });
  }
}
