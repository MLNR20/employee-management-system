import { test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import {
  DuplicateAdministratorError,
  InvalidCredentialsError,
  InvalidTokenError,
  TokenExpiredError,
  ValidationError,
} from "../src/domain/errors.js";
import { InMemoryAdministratorRepository } from "./fakes.js";

const secrets = { accessSecret: "a", refreshSecret: "r", accessTtl: "15m", refreshTtl: "7d" };

const setup = (overrides = {}) => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const tokenService = new JwtTokenService({ ...secrets, ...overrides });
  const auth = createAuthUseCases({
    administratorRepository,
    passwordHasher: new BcryptPasswordHasher(4), // low cost keeps tests fast
    tokenService,
    seedAdministrator: {
      username: "seed",
      password: "seed-pass1!",
      first_name: "Seed",
      last_name: "Admin",
      email: "seed@example.com",
    },
  });
  return { auth, administratorRepository, tokenService };
};

const registerAlice = (auth) =>
  auth.register({
    username: "alice",
    password: "pass-word1!",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
  });

test("login issues tokens and the access token identifies the administrator", async () => {
  const { auth } = setup();
  await registerAlice(auth);

  const { accessToken, refreshToken } = await auth.login({ username: "alice", password: "pass-word1!" });
  const user = auth.authenticate(accessToken);

  assert.equal(user.username, "alice");
  assert.equal(user.first_name, "Alice");
  assert.ok(refreshToken);
});

test("login rejects a wrong password and an unknown user with the same error", async () => {
  const { auth } = setup();
  await registerAlice(auth);

  await assert.rejects(auth.login({ username: "alice", password: "nope" }), InvalidCredentialsError);
  await assert.rejects(auth.login({ username: "ghost", password: "x" }), InvalidCredentialsError);
});

test("login rejects non-string credentials (query-operator injection)", async () => {
  const { auth } = setup();
  await registerAlice(auth);

  await assert.rejects(
    auth.login({ username: { $ne: null }, password: { $ne: null } }),
    InvalidCredentialsError
  );
});

test("register never returns the password hash and rejects duplicates and missing fields", async () => {
  const { auth } = setup();
  const created = await registerAlice(auth);

  assert.equal(created.passwordHash, undefined);
  assert.equal(created.password, undefined);
  await assert.rejects(registerAlice(auth), DuplicateAdministratorError);
  await assert.rejects(auth.register({ username: "bob" }), ValidationError);
});

test("refresh rotates the refresh token and the new pair works", async () => {
  const { auth } = setup();
  await registerAlice(auth);
  const first = await auth.login({ username: "alice", password: "pass-word1!" });

  const second = await auth.refreshSession({ refreshToken: first.refreshToken });

  assert.notEqual(second.refreshToken, first.refreshToken);
  assert.equal(auth.authenticate(second.accessToken).username, "alice");

  const third = await auth.refreshSession({ refreshToken: second.refreshToken });
  assert.ok(third.accessToken);
});

test("a rotated-out refresh token is rejected and ends the whole session", async () => {
  const { auth } = setup();
  await registerAlice(auth);
  const first = await auth.login({ username: "alice", password: "pass-word1!" });
  const second = await auth.refreshSession({ refreshToken: first.refreshToken });

  await assert.rejects(auth.refreshSession({ refreshToken: first.refreshToken }), InvalidTokenError);
  // The legitimate holder of the newest token is logged out too.
  await assert.rejects(auth.refreshSession({ refreshToken: second.refreshToken }), InvalidTokenError);
});

test("logout revokes the refresh token", async () => {
  const { auth } = setup();
  await registerAlice(auth);
  const { refreshToken } = await auth.login({ username: "alice", password: "pass-word1!" });

  await auth.logout({ refreshToken });

  await assert.rejects(auth.refreshSession({ refreshToken }), InvalidTokenError);
});

test("logout never throws, even for garbage", async () => {
  const { auth } = setup();
  await auth.logout({});
  await auth.logout({ refreshToken: "garbage" });
});

test("refresh rejects missing, garbage and access tokens", async () => {
  const { auth } = setup();
  await registerAlice(auth);
  const { accessToken } = await auth.login({ username: "alice", password: "pass-word1!" });

  await assert.rejects(auth.refreshSession({}), InvalidTokenError);
  await assert.rejects(auth.refreshSession({ refreshToken: "garbage" }), InvalidTokenError);
  // Different secrets: an access token can never act as a refresh token.
  await assert.rejects(auth.refreshSession({ refreshToken: accessToken }), InvalidTokenError);
});

test("an expired access token raises TokenExpiredError, a forged one InvalidTokenError", async () => {
  const { auth } = setup();
  const expired = jwt.sign({ id: "1" }, "a", { expiresIn: -10 });
  const forged = jwt.sign({ id: "1" }, "wrong-secret");

  assert.throws(() => auth.authenticate(expired), TokenExpiredError);
  assert.throws(() => auth.authenticate(forged), InvalidTokenError);
  assert.throws(() => auth.authenticate(forged), (e) => !(e instanceof TokenExpiredError));
});

test("an expired refresh token is rejected", async () => {
  const { auth } = setup({ refreshTtl: -10 });
  await registerAlice(auth);
  const { refreshToken } = await auth.login({ username: "alice", password: "pass-word1!" });

  await assert.rejects(auth.refreshSession({ refreshToken }), TokenExpiredError);
});

test("seeding creates one administrator once, who can then log in", async () => {
  const { auth, administratorRepository } = setup();

  assert.deepEqual(await auth.ensureAdministratorsExist(), { created: true });
  assert.deepEqual(await auth.ensureAdministratorsExist(), { created: false });
  assert.equal(await administratorRepository.count(), 1);
  await auth.login({ username: "seed", password: "seed-pass1!" });
});
