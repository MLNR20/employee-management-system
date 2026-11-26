import crypto from "node:crypto";

// Token signing secrets. Anyone who knows one can forge sign-ins, so a secret that is public (this
// repository once shipped defaults) is never used.

export const SECRET_NAMES = ["JWT_SECRET", "REFRESH_TOKEN_SECRET", "EMPLOYEE_JWT_SECRET"];

const PUBLISHED = new Set(["secret123", "refresh-secret123", "employee-secret123", "change-me"]);

const problemWith = (value, alreadyUsed) => {
  if (!value?.trim()) return "is not set";
  if (PUBLISHED.has(value.trim())) return "is a publicly known value";
  if (alreadyUsed.has(value)) return "repeats another secret";
  return null;
};

/**
 * Reads the signing secrets from the environment. One that is missing, publicly known or the same as
 * another is replaced by a random one that lasts as long as this process: the server stays safe and
 * usable, but everyone it signed in has to sign in again after a restart.
 *
 * @param {Record<string, string | undefined>} env
 * @param {(message: string) => void} [warn]
 * @returns {{JWT_SECRET: string, REFRESH_TOKEN_SECRET: string, EMPLOYEE_JWT_SECRET: string}}
 */
export const resolveSecrets = (env, warn = console.warn) => {
  const used = new Set();
  const replaced = [];

  const secrets = Object.fromEntries(
    SECRET_NAMES.map((name) => {
      const problem = problemWith(env[name], used);
      if (!problem) {
        used.add(env[name]);
        return [name, env[name]];
      }
      replaced.push(`${name} ${problem}`);
      return [name, crypto.randomBytes(48).toString("base64url")];
    })
  );

  if (replaced.length) {
    warn(
      `WARNING: ${replaced.join("; ")}. Using random secrets until the server restarts, which signs ` +
        "everyone out then. Set them in the environment (see server/.env.example)."
    );
  }
  return secrets;
};
