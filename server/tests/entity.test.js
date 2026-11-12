import { test } from "node:test";
import assert from "node:assert/strict";
import { Entity } from "../src/domain/Entity.js";
import { Employee } from "../src/domain/employee/Employee.js";
import { Department } from "../src/domain/department/Department.js";
import { Administrator } from "../src/domain/administrator/Administrator.js";
import { createInMemoryDepartmentRepository, InMemoryAdministratorRepository } from "./fakes.js";
import { createAuthUseCases } from "../src/application/auth/authUseCases.js";
import { BcryptPasswordHasher } from "../src/infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../src/infrastructure/security/JwtTokenService.js";
import { InvalidCredentialsError } from "../src/domain/errors.js";

test("Employee, Department and Administrator all inherit from Entity", () => {
  for (const instance of [new Employee(), new Department(), new Administrator()]) {
    assert.ok(instance instanceof Entity);
    assert.equal(instance.isActive, true); // active unless stated otherwise
    assert.ok("dateCreated" in instance && "dateUpdated" in instance && "id" in instance);
  }
});

test("base fields pass through the subclass constructor", () => {
  const created = new Date("2024-01-01");
  const updated = new Date("2024-02-01");
  const dept = new Department({
    id: "1",
    name: "Finance",
    code: "FIN",
    dateCreated: created,
    dateUpdated: updated,
    isActive: false,
  });

  assert.equal(dept.name, "Finance");
  assert.equal(dept.dateCreated, created);
  assert.equal(dept.dateUpdated, updated);
  assert.equal(dept.isActive, false);
});

test("the generic repository sets and advances the audit dates", async () => {
  const repository = createInMemoryDepartmentRepository();
  const created = await repository.create({ name: "HR", code: "HR" });
  assert.ok(created.dateCreated instanceof Date);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const updated = await repository.update(created.id, { name: "Human Resources", code: "HR" });

  assert.equal(updated.dateCreated.getTime(), created.dateCreated.getTime());
  assert.ok(updated.dateUpdated.getTime() > created.dateUpdated.getTime());
});

test("a deactivated administrator cannot log in", async () => {
  const administratorRepository = new InMemoryAdministratorRepository();
  const auth = createAuthUseCases({
    administratorRepository,
    passwordHasher: new BcryptPasswordHasher(4),
    tokenService: new JwtTokenService({
      accessSecret: "a",
      refreshSecret: "r",
      accessTtl: "15m",
      refreshTtl: "7d",
    }),
  });
  const alice = await auth.register({
    username: "alice",
    password: "pass-word1!",
    first_name: "Alice",
    last_name: "Smith",
    email: "alice@example.com",
  });

  await auth.login({ username: "alice", password: "pass-word1!" });

  administratorRepository.admins.get(alice.id).isActive = false;
  await assert.rejects(
    auth.login({ username: "alice", password: "pass-word1!" }),
    InvalidCredentialsError
  );
});
