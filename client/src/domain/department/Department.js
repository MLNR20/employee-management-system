import { Entity, baseProps } from "../Entity";

export class Department extends Entity {
  constructor({ name, code, description, ...base } = {}) {
    super(base);
    this.name = name;
    this.code = code;
    this.description = description;
  }

  /** Builds a Department from an API payload. */
  static fromApi(raw = {}) {
    return new Department({
      ...baseProps(raw),
      name: raw.name,
      code: raw.code,
      description: raw.description,
    });
  }
}
