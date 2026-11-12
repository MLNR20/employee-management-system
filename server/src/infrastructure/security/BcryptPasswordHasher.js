import bcrypt from "bcryptjs";
import { PasswordHasher } from "../../application/ports/PasswordHasher.js";

export class BcryptPasswordHasher extends PasswordHasher {
  constructor(saltRounds = 10) {
    super();
    this.saltRounds = saltRounds;
  }

  hash(plain) {
    return bcrypt.hash(plain, this.saltRounds);
  }

  compare(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
}
