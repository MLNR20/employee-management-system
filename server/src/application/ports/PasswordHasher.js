/** Port: how passwords are hashed. Infrastructure supplies the algorithm. */
export class PasswordHasher {
  /** @returns {Promise<string>} */
  async hash(plain) {
    throw new Error("PasswordHasher.hash not implemented");
  }

  /** @returns {Promise<boolean>} */
  async compare(plain, hash) {
    throw new Error("PasswordHasher.compare not implemented");
  }
}
