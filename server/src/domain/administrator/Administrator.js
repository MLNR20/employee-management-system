import { Entity } from "../Entity.js";

export class Administrator extends Entity {
  constructor({ username, first_name, last_name, email, passwordHash, ...base } = {}) {
    super(base);
    this.username = username;
    this.first_name = first_name;
    this.last_name = last_name;
    this.email = email;
    this.passwordHash = passwordHash;
  }
}

/** What may leave the system: never the password hash. */
export const toPublicAdministrator = ({ id, username, first_name, last_name, email }) => ({
  id,
  username,
  first_name,
  last_name,
  email,
});
