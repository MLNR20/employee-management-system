import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { normalizePageQuery, toPage, MAX_PAGE_SIZE } from "../src/domain/pagination.js";
import { createCrudUseCases } from "../src/application/shared/crudUseCases.js";
import { createCrudRouter } from "../src/presentation/http/routes/crudRouter.js";
import { createInMemoryDepartmentRepository } from "./fakes.js";

test("normalizePageQuery applies defaults and clamps bad values", () => {
  assert.deepEqual(normalizePageQuery({}), { page: 1, pageSize: 10, search: "", sortBy: undefined, sortDir: 1 });
  assert.equal(normalizePageQuery({ page: "0" }).page, 1);
  assert.equal(normalizePageQuery({ page: "-3" }).page, 1);
  assert.equal(normalizePageQuery({ page: "abc" }).page, 1);
  assert.equal(normalizePageQuery({ page: "4" }).page, 4);
  assert.equal(normalizePageQuery({ pageSize: "5000" }).pageSize, MAX_PAGE_SIZE);
  assert.equal(normalizePageQuery({ pageSize: "25" }).pageSize, 25);
  assert.equal(normalizePageQuery({ search: "  ann " }).search, "ann");
  assert.equal(normalizePageQuery({ search: ["a", "b"] }).search, "");
  assert.equal(normalizePageQuery({ sortBy: "name", sortDir: "DESC" }).sortDir, -1);
});

test("toPage reports at least one page, even when empty", () => {
  assert.equal(toPage({ items: [], total: 0 }, { page: 1, pageSize: 10 }).totalPages, 1);
  assert.equal(toPage({ items: [], total: 21 }, { page: 1, pageSize: 10 }).totalPages, 3);
});

const seed = async () => {
  const repository = createInMemoryDepartmentRepository();
  for (let i = 1; i <= 25; i++) {
    await repository.create({ name: `Dept ${String(i).padStart(2, "0")}`, code: `D${i}`, description: i % 5 === 0 ? "special" : "" });
  }
  return createCrudUseCases({
    repository,
    entityName: "Department",
    validate: () => {},
    pickFields: (input) => input,
  });
};

test("listPage returns one page and the total", async () => {
  const useCases = await seed();

  const first = await useCases.listPage({ page: "1", pageSize: "10", sortBy: "name" });
  assert.equal(first.items.length, 10);
  assert.equal(first.total, 25);
  assert.equal(first.totalPages, 3);
  assert.equal(first.items[0].name, "Dept 01");

  const last = await useCases.listPage({ page: "3", pageSize: "10", sortBy: "name" });
  assert.equal(last.items.length, 5);
  assert.equal(last.items[4].name, "Dept 25");

  const beyond = await useCases.listPage({ page: "9", pageSize: "10" });
  assert.equal(beyond.items.length, 0);
  assert.equal(beyond.total, 25);
});

test("listPage searches and sorts descending on the server", async () => {
  const useCases = await seed();

  const found = await useCases.listPage({ search: "special", pageSize: "10" });
  assert.equal(found.total, 5);

  const desc = await useCases.listPage({ sortBy: "name", sortDir: "desc", pageSize: "3" });
  assert.deepEqual(desc.items.map((d) => d.name), ["Dept 25", "Dept 24", "Dept 23"]);
});

test("the list route pages only when asked, and still returns everything otherwise", async () => {
  const useCases = await seed();
  const app = express();
  app.use(
    "/departments",
    createCrudRouter({
      entityName: "Department",
      operations: ["list"],
      useCases: { list: () => useCases.list(), listPage: useCases.listPage },
    })
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  try {
    const base = `http://localhost:${server.address().port}/departments/`;

    const paged = await (await fetch(`${base}?page=2&pageSize=10&sortBy=name`)).json();
    assert.equal(paged.count, 25);
    assert.equal(paged.page, 2);
    assert.equal(paged.pageSize, 10);
    assert.equal(paged.totalPages, 3);
    assert.equal(paged.data.length, 10);
    assert.ok(paged.data[0]._id);

    const all = await (await fetch(base)).json();
    assert.equal(all.count, 25);
    assert.equal(all.data.length, 25);
    assert.equal(all.page, undefined);
  } finally {
    server.close();
  }
});
