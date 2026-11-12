import { emptyValue, initialValuesFor, toPayload, validateFields } from "./formRules";

const fields = [
  { name: "name", label: "Name", required: true, minLength: 2 },
  { name: "email", label: "Email", type: "email" },
  { name: "max", label: "Maximum", type: "number", required: true, min: 0 },
  {
    name: "available",
    label: "Available",
    type: "number",
    validate: (value, all) => (Number(value) > Number(all.max) ? "Too many." : undefined),
  },
  { name: "code", label: "Code", pattern: /^[A-Z]+$/, patternMessage: "Capitals only." },
  { name: "active", label: "Active", type: "checkbox", default: true },
];

const valid = { name: "Finance", email: "", max: "10", available: "", code: "", active: true };

test("a valid form has no errors, and optional blanks are skipped", () => {
  expect(validateFields(fields, valid)).toEqual({});
});

test("required fields fail when blank or only spaces", () => {
  const errors = validateFields(fields, { ...valid, name: "   ", max: "" });
  expect(errors.name).toBe("Name is required.");
  expect(errors.max).toBe("Maximum is required.");
});

test("length, email, number and pattern rules", () => {
  expect(validateFields(fields, { ...valid, name: "A" }).name).toMatch(/at least 2/);
  expect(validateFields(fields, { ...valid, email: "nope" }).email).toBe("Enter a valid email address.");
  expect(validateFields(fields, { ...valid, email: "a@b.co" }).email).toBeUndefined();
  expect(validateFields(fields, { ...valid, max: "abc" }).max).toMatch(/must be a number/);
  expect(validateFields(fields, { ...valid, max: "-1" }).max).toMatch(/at least 0/);
  expect(validateFields(fields, { ...valid, code: "ab" }).code).toBe("Capitals only.");
  expect(validateFields(fields, { ...valid, code: "AB" }).code).toBeUndefined();
});

test("a custom validate rule sees all the values", () => {
  expect(validateFields(fields, { ...valid, max: "5", available: "9" }).available).toBe("Too many.");
  expect(validateFields(fields, { ...valid, max: "5", available: "5" }).available).toBeUndefined();
});

test("checkboxes are never validated", () => {
  expect(validateFields([{ name: "x", label: "X", type: "checkbox", required: true }], { x: false })).toEqual({});
});

test("toPayload trims text, converts numbers and leaves blank optional numbers out", () => {
  expect(toPayload(fields, { ...valid, name: "  Finance  ", max: "10", available: "" })).toEqual({
    name: "Finance",
    email: "",
    max: 10,
    code: "",
    active: true,
  });
  expect(toPayload(fields, { ...valid, max: "7.5", available: "2.5" })).toMatchObject({ max: 7.5, available: 2.5 });
});

test("initial values come from the entity when given, else from field defaults", () => {
  expect(emptyValue({ type: "checkbox" })).toBe(false);
  expect(emptyValue({ name: "n" })).toBe("");
  expect(emptyValue({ name: "n", default: "x" })).toBe("x");

  expect(initialValuesFor(fields).active).toBe(true);
  expect(initialValuesFor(fields).name).toBe("");

  const loaded = initialValuesFor(fields, { name: "HR", max: 5, active: false, available: null });
  expect(loaded).toMatchObject({ name: "HR", max: 5, active: false, available: "" });
});
