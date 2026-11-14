import {
  allKeys,
  catalogActions,
  hasAll,
  hasSome,
  isDirty,
  moduleKeys,
  setMany,
  toggle,
} from "./permissionRules";

const catalog = [
  { key: "employees", label: "Employees", actions: ["view", "create", "edit"] },
  { key: "leave-requests", label: "Leave Requests", actions: ["view", "approve"] },
];

test("columns are the distinct actions in first-seen order", () => {
  expect(catalogActions(catalog)).toEqual(["view", "create", "edit", "approve"]);
});

test("keys are module:action", () => {
  expect(moduleKeys(catalog[1])).toEqual(["leave-requests:view", "leave-requests:approve"]);
  expect(allKeys(catalog)).toHaveLength(5);
});

test("toggle and setMany return new sets and leave the original alone", () => {
  const start = new Set(["employees:view"]);

  const on = toggle(start, "employees:edit");
  expect([...on].sort()).toEqual(["employees:edit", "employees:view"]);
  expect(start.size).toBe(1);
  expect(toggle(on, "employees:edit").has("employees:edit")).toBe(false);

  const row = setMany(start, moduleKeys(catalog[0]), true);
  expect(hasAll(row, moduleKeys(catalog[0]))).toBe(true);
  expect(hasSome(setMany(row, moduleKeys(catalog[0]), false), moduleKeys(catalog[0]))).toBe(false);
});

test("hasAll is false for an empty group", () => {
  expect(hasAll(new Set(["a"]), [])).toBe(false);
});

test("isDirty compares the draft to the saved list regardless of order", () => {
  expect(isDirty(new Set(["a", "b"]), ["b", "a"])).toBe(false);
  expect(isDirty(new Set(["a"]), ["a", "b"])).toBe(true);
  expect(isDirty(new Set(["a", "c"]), ["a", "b"])).toBe(true);
  expect(isDirty(new Set(), undefined)).toBe(false);
});
