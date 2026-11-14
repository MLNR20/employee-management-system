import { personNameSchema, validatePersonName } from "./personName";
import { validateFields } from "../components/form/formRules";

test("a name must be present", () => {
  expect(validatePersonName("First name", "")).toBe("First name is required.");
  expect(validatePersonName("First name", "   ")).toBe("First name is required.");
  expect(validatePersonName("First name", undefined)).toBe("First name is required.");
});

test("a name must be at least 2 characters", () => {
  expect(validatePersonName("Last name", "A")).toBe("Last name must be at least 2 characters.");
  expect(validatePersonName("Last name", "Al")).toBeUndefined();
});

test("a name accepts letters only", () => {
  for (const bad of ["Maria3", "Ma_ria", "Maria!", "-Maria", "Mary Ann", "Dela-Cruz", "O'Brien", "M@ria", "12"]) {
    expect(validatePersonName("First name", bad)).toMatch(/letters only/);
  }
  for (const good of ["Maria", "Peña", "SANTOS", "  Santos  "]) {
    expect(validatePersonName("First name", good)).toBeUndefined();
  }
});

test("a form field with a zod schema shows the schema's message", () => {
  const fields = [
    { name: "firstName", label: "First name", required: true, schema: personNameSchema("First name") },
    { name: "lastName", label: "Last name", required: true, schema: personNameSchema("Last name") },
  ];

  expect(validateFields(fields, { firstName: "M", lastName: "Santos" })).toEqual({
    firstName: "First name must be at least 2 characters.",
  });
  expect(validateFields(fields, { firstName: "Maria", lastName: "San7os" }).lastName).toMatch(/letters only/);
  expect(validateFields(fields, { firstName: "", lastName: "" })).toEqual({
    firstName: "First name is required.",
    lastName: "Last name is required.",
  });
  expect(validateFields(fields, { firstName: "Maria", lastName: "Santos" })).toEqual({});
});
