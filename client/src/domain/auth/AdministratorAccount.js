import { Entity, baseProps } from "../Entity";

/** An administrator as listed for pickers (never carries credentials). */
export class AdministratorAccount extends Entity {
  constructor({ username, first_name, last_name, email, ...base } = {}) {
    super(base);
    this.username = username;
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
  }

  get fullName() {
    return `${this.first_name} ${this.last_name}`;
  }

  static fromApi(raw = {}) {
    return new AdministratorAccount({
      ...baseProps(raw),
      username: raw.username,
      first_name: raw.first_name,
      last_name: raw.last_name,
      email: raw.email,
    });
  }
}
