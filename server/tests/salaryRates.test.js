// Assigning hourly rates is HR only: an administrator needs an active role that grants
// salary-rates:assign (and salary-rates:view to read). Real permission middleware and routes,
// in-memory repositories, and a stand-in sign-in that reads the administrator id from a header.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createSalaryRateUseCases } from "../src/application/salary/salaryRateUseCases.js";
import { createAuthorizationUseCases } from "../src/application/role/authorizationUseCases.js";
import { createSalaryRateRouter } from "../src/presentation/http/routes/salaryRateRoutes.js";
import { createRequirePermission } from "../src/presentation/http/middleware/permissionMiddleware.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  InMemoryRoleAssignmentRepository,
  InMemorySalaryRateRepository,
  createInMemoryEmployeeRepository,
  createInMemoryRoleRepository,
} from "./fakes.js";

let server;
let base;
let employee;
let salaryRateRepository;
const HR = "000000000000000000000a01";
const HR_READER = "000000000000000000000a02";
const CLERK = "000000000000000000000a03";
const INACTIVE_HR = "000000000000000000000a04";

before(async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const roleRepository = createInMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  salaryRateRepository = new InMemorySalaryRateRepository();

  employee = await employeeRepository.create({ first_name: "Ann", last_name: "Lee", email: "ann@example.com", salary: 17600 });

  const grant = async (administratorId, role) => {
    const stored = await roleRepository.create(role);
    await roleAssignmentRepository.create({ administratorId, roleId: stored.id });
  };
  await grant(HR, { name: "HR", permissions: ["salary-rates:view", "salary-rates:assign"] });
  await grant(HR_READER, { name: "HR Reader", permissions: ["salary-rates:view"] });
  await grant(CLERK, { name: "Clerk", permissions: ["employees:view"] });
  await grant(INACTIVE_HR, { name: "Old HR", isActive: false, permissions: ["salary-rates:assign", "salary-rates:view"] });

  const app = express();
  app.use(express.json());
  const requireAuth = (req, res, next) => {
    const id = req.headers["x-admin"];
    if (!id) return res.status(401).json({ message: "Sign in" });
    req.user = { id };
    next();
  };
  app.use(
    "/salary-rates",
    createSalaryRateRouter({
      salaryRateUseCases: createSalaryRateUseCases({
        salaryRateRepository,
        employeeRepository,
        now: () => new Date("2026-03-02T10:00:00.000Z"),
      }),
      requireAuth,
      requirePermission: createRequirePermission(createAuthorizationUseCases({ roleAssignmentRepository, roleRepository })),
    })
  );
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, { as, body } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(as ? { "x-admin": as } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json().catch(() => null) };
};

test("only administrators whose role grants salary-rates:assign can assign a rate", async () => {
  const body = { employeeId: employee.id, hourlyRate: 125.5 };

  assert.equal((await call("POST", "/salary-rates/", { body })).status, 401, "not signed in");
  assert.equal((await call("POST", "/salary-rates/", { as: CLERK, body })).status, 403, "role without it");
  assert.equal((await call("POST", "/salary-rates/", { as: HR_READER, body })).status, 403, "can view, not assign");
  assert.equal((await call("POST", "/salary-rates/", { as: INACTIVE_HR, body })).status, 403, "inactive role");
  assert.equal((await call("POST", "/salary-rates/", { as: "000000000000000000000fff", body })).status, 403, "no role at all");
  assert.equal(salaryRateRepository.items.size, 0, "nothing was stored by the refused requests");

  const assigned = await call("POST", "/salary-rates/", { as: HR, body });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.hourlyRate, 125.5);
  assert.equal(assigned.body.effectiveFrom, "2026-03-02", "defaults to today");
  assert.equal(assigned.body.assignedBy, HR, "recorded from the sign-in");
});

test("who assigned a rate cannot be forged, and bad input is rejected", async () => {
  const forged = await call("POST", "/salary-rates/", {
    as: HR,
    body: { employeeId: employee.id, hourlyRate: 130, effectiveFrom: "2026-04-01", assignedBy: CLERK },
  });
  assert.equal(forged.status, 200);
  assert.equal(forged.body.assignedBy, HR);
  assert.equal(forged.body.effectiveFrom, "2026-04-01");

  const post = (body) => call("POST", "/salary-rates/", { as: HR, body });
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ employeeId: employee.id, hourlyRate: 0 })).status, 400);
  assert.equal((await post({ employeeId: employee.id, hourlyRate: -5 })).status, 400);
  assert.equal((await post({ employeeId: employee.id, hourlyRate: "abc" })).status, 400);
  assert.equal((await post({ employeeId: employee.id, hourlyRate: 10, effectiveFrom: "soon" })).status, 400);
  assert.equal((await post({ employeeId: "nope", hourlyRate: 10 })).status, 404);
});

test("reading rates needs salary-rates:view, and rates are never edited or deleted", async () => {
  assert.equal((await call("GET", "/salary-rates/", { as: CLERK })).status, 403);
  assert.equal((await call("GET", `/salary-rates/employee/${employee.id}`, { as: CLERK })).status, 403);

  const list = await call("GET", "/salary-rates/", { as: HR_READER });
  assert.equal(list.status, 200);
  assert.ok(list.body.count >= 2);

  const history = await call("GET", `/salary-rates/employee/${employee.id}`, { as: HR_READER });
  assert.equal(history.status, 200);
  assert.deepEqual(
    history.body.data.map((r) => r.effectiveFrom),
    ["2026-04-01", "2026-03-02"],
    "newest effective date first"
  );

  const id = history.body.data[0]._id;
  assert.equal((await call("GET", `/salary-rates/${id}`, { as: HR_READER })).status, 200);
  assert.equal((await call("GET", `/salary-rates/${id}`, { as: CLERK })).status, 403);
  assert.equal((await call("PUT", `/salary-rates/${id}`, { as: HR, body: { hourlyRate: 1 } })).status, 404);
  assert.equal((await call("DELETE", `/salary-rates/${id}`, { as: HR })).status, 404);
});

test("the rate in force on a day is the latest one that started on or before it", async () => {
  assert.equal(await salaryRateRepository.findEffective(employee.id, "2026-03-01"), null);
  assert.equal((await salaryRateRepository.findEffective(employee.id, "2026-03-02")).hourlyRate, 125.5);
  assert.equal((await salaryRateRepository.findEffective(employee.id, "2026-03-31")).hourlyRate, 125.5);
  assert.equal((await salaryRateRepository.findEffective(employee.id, "2026-04-01")).hourlyRate, 130);
});
