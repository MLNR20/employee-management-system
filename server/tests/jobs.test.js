// Jobs and job applications: administrators manage postings and follow applications up, and an
// employee submits a resume link through the portal. Real routes and use cases over in-memory
// repositories, with a stand-in sign-in that reads the user id from a header.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createJobUseCases } from "../src/application/job/jobUseCases.js";
import { createJobApplicationUseCases } from "../src/application/job/jobApplicationUseCases.js";
import { createJobApplicationRouter, createJobRouter } from "../src/presentation/http/routes/jobRoutes.js";
import { createEmployeePortalRouter } from "../src/presentation/http/routes/employeePortalRoutes.js";
import { errorHandler } from "../src/presentation/http/middleware/errorHandler.js";
import {
  InMemoryJobApplicationRepository,
  InMemoryJobRepository,
  createInMemoryEmployeeRepository,
} from "./fakes.js";

let server;
let base;
let ann;
let ben;
let inactive;
let applicationRepository;

const ADMIN = "000000000000000000000b01";
const RESUME = "https://drive.example.com/ann-resume.pdf";

before(async () => {
  const employeeRepository = createInMemoryEmployeeRepository();
  const jobRepository = new InMemoryJobRepository();
  applicationRepository = new InMemoryJobApplicationRepository();

  const person = (first_name, extra = {}) =>
    employeeRepository.create({ first_name, last_name: "Lee", email: `${first_name.toLowerCase()}@example.com`, ...extra });
  ann = await person("Ann");
  ben = await person("Ben");
  inactive = await person("Cy", { isActive: false });

  const jobUseCases = createJobUseCases({ jobRepository, jobApplicationRepository: applicationRepository });
  const jobApplicationUseCases = createJobApplicationUseCases({
    jobApplicationRepository: applicationRepository,
    jobRepository,
    employeeRepository,
    now: () => new Date("2026-03-02T10:00:00.000Z"),
  });

  const signIn = (header) => (req, res, next) => {
    const id = req.headers[header];
    if (!id) return res.status(401).json({ message: "Sign in" });
    req.user = { id };
    next();
  };

  const app = express();
  app.use(express.json());
  app.use("/jobs", createJobRouter({ jobUseCases, requireAuth: signIn("x-admin") }));
  app.use("/job-applications", createJobApplicationRouter({ jobApplicationUseCases, requireAuth: signIn("x-admin") }));
  app.use(
    "/employee-portal",
    createEmployeePortalRouter({ jobUseCases, jobApplicationUseCases, requireEmployeeAuth: signIn("x-employee") })
  );
  app.use(errorHandler);
  await new Promise((resolve) => (server = app.listen(0, resolve)));
  base = `http://localhost:${server.address().port}`;
});

after(() => server.close());

const call = async (method, path, { body, admin, employee } = {}) => {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(admin ? { "x-admin": admin } : {}),
      ...(employee ? { "x-employee": employee } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    // Express's own 404 for a path with no route is HTML
  }
  return { status: response.status, body: parsed };
};

const newJob = (overrides = {}) => ({
  jobTitle: "Backend Developer",
  jobDescription: "Builds and maintains the HR APIs.",
  ...overrides,
});

const createJob = async (overrides) => (await call("POST", "/jobs", { admin: ADMIN, body: newJob(overrides) })).body;

test("an administrator creates a job that is open by default, and the job needs a title and a description", async () => {
  const created = await call("POST", "/jobs", { admin: ADMIN, body: newJob() });
  assert.equal(created.status, 200);
  assert.equal(created.body.jobTitle, "Backend Developer");
  assert.equal(created.body.jobDescription, "Builds and maintains the HR APIs.");
  assert.equal(created.body.status, "open");
  assert.ok(created.body._id);

  assert.equal((await call("POST", "/jobs", { admin: ADMIN, body: newJob({ jobTitle: "  " }) })).status, 400);
  assert.equal((await call("POST", "/jobs", { admin: ADMIN, body: { jobTitle: "QA" } })).status, 400);
  assert.equal((await call("POST", "/jobs", { admin: ADMIN, body: newJob({ status: "paused" }) })).status, 400);
});

test("the job routes need an administrator", async () => {
  assert.equal((await call("GET", "/jobs")).status, 401);
  assert.equal((await call("POST", "/jobs", { body: newJob() })).status, 401);
  assert.equal((await call("GET", "/job-applications")).status, 401);
  assert.equal((await call("GET", "/jobs", { employee: ann.id })).status, 401); // an employee token is not an admin one
});

test("an administrator edits a job and closes it", async () => {
  const job = await createJob();
  const closed = await call("PUT", `/jobs/${job._id}`, { admin: ADMIN, body: newJob({ status: "closed" }) });
  assert.equal(closed.status, 200);
  assert.equal((await call("GET", `/jobs/${job._id}`, { admin: ADMIN })).body.status, "closed");
  assert.equal((await call("GET", "/jobs/000000000000000000000fff", { admin: ADMIN })).status, 404);
});

test("employees see only open jobs in the portal", async () => {
  const open = await createJob({ jobTitle: "Open Role" });
  const closed = await createJob({ jobTitle: "Closed Role", status: "closed" });

  const listed = await call("GET", "/employee-portal/jobs", { employee: ann.id });
  assert.equal(listed.status, 200);
  const ids = listed.body.data.map((job) => job._id);
  assert.ok(ids.includes(open._id));
  assert.equal(ids.includes(closed._id), false);
  assert.deepEqual(Object.keys(listed.body.data[0]).sort(), ["_id", "jobDescription", "jobTitle", "status"]);

  assert.equal((await call("GET", "/employee-portal/jobs")).status, 401);
});

test("an employee submits their resume link for an open job", async () => {
  const job = await createJob();
  const applied = await call("POST", "/employee-portal/job-applications", {
    employee: ann.id,
    body: { jobId: job._id, resumeLink: `  ${RESUME}  ` },
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.body.employeeId, ann.id);
  assert.equal(applied.body.jobId, job._id);
  assert.equal(applied.body.resumeLink, RESUME);
  assert.equal(applied.body.status, "submitted");
  assert.equal(new Date(applied.body.dateSubmitted).toISOString(), "2026-03-02T10:00:00.000Z");

  const mine = await call("GET", "/employee-portal/job-applications", { employee: ann.id });
  assert.equal(mine.body.count, 1);
  assert.equal(mine.body.data[0]._id, applied.body._id);

  // Ben sees none of Ann's applications.
  assert.equal((await call("GET", "/employee-portal/job-applications", { employee: ben.id })).body.count, 0);
});

test("the applicant, status and date come from the server, not the body", async () => {
  const job = await createJob();
  const applied = await call("POST", "/employee-portal/job-applications", {
    employee: ben.id,
    body: {
      jobId: job._id,
      resumeLink: RESUME,
      employeeId: ann.id,
      status: "accepted",
      dateSubmitted: "2001-01-01",
    },
  });
  assert.equal(applied.status, 200);
  assert.equal(applied.body.employeeId, ben.id);
  assert.equal(applied.body.status, "submitted");
  assert.equal(new Date(applied.body.dateSubmitted).getFullYear(), 2026);
});

test("an application needs a job and an http(s) resume link", async () => {
  const job = await createJob();
  const apply = (body, employee = ann.id) => call("POST", "/employee-portal/job-applications", { employee, body });

  assert.equal((await apply({ resumeLink: RESUME })).status, 400);
  assert.equal((await apply({ jobId: job._id })).status, 400);
  assert.equal((await apply({ jobId: job._id, resumeLink: "not a link" })).status, 400);
  assert.equal((await apply({ jobId: job._id, resumeLink: "javascript:alert(1)" })).status, 400);
  assert.equal((await apply({ jobId: job._id, resumeLink: "ftp://example.com/cv.pdf" })).status, 400);
  assert.equal((await apply({ jobId: job._id, resumeLink: ["https://example.com"] })).status, 400);
});

test("an employee cannot apply to a closed or missing job, and cannot apply twice", async () => {
  const open = await createJob();
  const closed = await createJob({ status: "closed" });
  const apply = (jobId, employee = ben.id) =>
    call("POST", "/employee-portal/job-applications", { employee, body: { jobId, resumeLink: RESUME } });

  assert.equal((await apply(closed._id)).status, 409);
  assert.equal((await apply("000000000000000000000fff")).status, 404);

  assert.equal((await apply(open._id)).status, 200);
  assert.equal((await apply(open._id)).status, 409); // same job again
  assert.equal((await apply(open._id, ann.id)).status, 200); // someone else may apply to it
});

test("an inactive or unknown employee cannot apply", async () => {
  const job = await createJob();
  const apply = (employee) =>
    call("POST", "/employee-portal/job-applications", { employee, body: { jobId: job._id, resumeLink: RESUME } });

  assert.equal((await apply(inactive.id)).status, 404);
  assert.equal((await apply("000000000000000000000fff")).status, 404);
});

test("an administrator lists applications, filters by job and moves one to a new status", async () => {
  const job = await createJob({ jobTitle: "Designer" });
  const applied = await call("POST", "/employee-portal/job-applications", {
    employee: ann.id,
    body: { jobId: job._id, resumeLink: RESUME },
  });

  const forJob = await call("GET", `/job-applications/job/${job._id}`, { admin: ADMIN });
  assert.equal(forJob.status, 200);
  assert.equal(forJob.body.count, 1);
  assert.equal(forJob.body.data[0].resumeLink, RESUME);
  assert.equal((await call("GET", "/job-applications/job/000000000000000000000fff", { admin: ADMIN })).status, 404);

  const all = await call("GET", "/job-applications", { admin: ADMIN });
  assert.ok(all.body.data.some((application) => application._id === applied.body._id));

  const reviewed = await call("PUT", `/job-applications/${applied.body._id}/status`, {
    admin: ADMIN,
    body: { status: "under_review" },
  });
  assert.equal(reviewed.status, 200);
  assert.equal(reviewed.body.status, "under_review");
  assert.equal((await call("GET", `/job-applications/${applied.body._id}`, { admin: ADMIN })).body.status, "under_review");

  assert.equal(
    (await call("PUT", `/job-applications/${applied.body._id}/status`, { admin: ADMIN, body: { status: "hired!" } })).status,
    400
  );
  assert.equal(
    (await call("PUT", "/job-applications/000000000000000000000fff/status", { admin: ADMIN, body: { status: "accepted" } })).status,
    404
  );
});

test("applications cannot be created, edited or deleted through the admin routes", async () => {
  const job = await createJob();
  const body = { jobId: job._id, employeeId: ann.id, resumeLink: RESUME };
  assert.equal((await call("POST", "/job-applications", { admin: ADMIN, body })).status, 404);

  const applied = await call("POST", "/employee-portal/job-applications", {
    employee: ben.id,
    body: { jobId: job._id, resumeLink: RESUME },
  });
  assert.equal((await call("PUT", `/job-applications/${applied.body._id}`, { admin: ADMIN, body })).status, 404);
  assert.equal((await call("DELETE", `/job-applications/${applied.body._id}`, { admin: ADMIN })).status, 404);
});

test("a job nobody applied to can be deleted, one with applications cannot", async () => {
  const lonely = await createJob({ jobTitle: "Lonely Role" });
  assert.equal((await call("DELETE", `/jobs/${lonely._id}`, { admin: ADMIN })).status, 200);
  assert.equal((await call("GET", `/jobs/${lonely._id}`, { admin: ADMIN })).status, 404);
  assert.equal((await call("DELETE", `/jobs/${lonely._id}`, { admin: ADMIN })).status, 404);

  const wanted = await createJob({ jobTitle: "Wanted Role" });
  await call("POST", "/employee-portal/job-applications", {
    employee: ann.id,
    body: { jobId: wanted._id, resumeLink: RESUME },
  });
  assert.equal((await call("DELETE", `/jobs/${wanted._id}`, { admin: ADMIN })).status, 409);
  assert.equal((await call("GET", `/jobs/${wanted._id}`, { admin: ADMIN })).status, 200);
  assert.ok(await applicationRepository.existsForJob(wanted._id));
});
