import { hasContactInput, toContactPayload, validateContact } from "./emergencyContactRules";

const complete = {
  firstName: "Maria",
  lastName: "Santos",
  relationship: "Mother",
  phoneNumber: "+63 917 123 4567",
};

test("an untouched contact section is valid and counts as empty", () => {
  expect(hasContactInput({})).toBe(false);
  expect(hasContactInput({ firstName: "   " })).toBe(false);
  expect(validateContact({})).toEqual({});
});

test("a complete contact passes", () => {
  expect(validateContact(complete)).toEqual({});
});

test("once anything is typed the required fields are enforced", () => {
  const errors = validateContact({ email: "maria@example.com" });
  expect(Object.keys(errors).sort()).toEqual(["firstName", "lastName", "phoneNumber", "relationship"]);
});

test("names are letters only and phone needs 7 to 15 digits", () => {
  const errors = validateContact({ ...complete, firstName: "Ma1ia", phoneNumber: "12345" });
  expect(errors.firstName).toMatch(/letters only/);
  expect(errors.phoneNumber).toMatch(/7 to 15 digits/);
});

test("email is optional but must be valid when given", () => {
  expect(validateContact({ ...complete, email: "" })).toEqual({});
  expect(validateContact({ ...complete, email: "nope" }).email).toMatch(/valid email/);
});

test("the payload trims text and carries the employee id", () => {
  const payload = toContactPayload("emp-1", { ...complete, firstName: " Maria ", address: undefined });
  expect(payload).toMatchObject({ employeeId: "emp-1", firstName: "Maria", address: "" });
});

describe("contact rows on the employee form", () => {
  const { newContactRow, contactRowFromEntity, validateContactRows } = require("./emergencyContactRules");

  test("new rows get distinct keys and a blank new row is ignored", () => {
    const [a, b] = [newContactRow(), newContactRow()];
    expect(a.key).not.toEqual(b.key);
    expect(validateContactRows([a, b])).toEqual({});
  });

  test("errors are reported per row", () => {
    const bad = { ...newContactRow(), firstName: "Maria" };
    const good = { ...newContactRow(), ...complete };
    const errors = validateContactRows([bad, good]);
    expect(Object.keys(errors)).toEqual([bad.key]);
    expect(errors[bad.key].lastName).toBeTruthy();
  });

  test("a saved contact cannot be blanked out, only filled in or removed", () => {
    const row = contactRowFromEntity({ id: "c1", firstName: "", lastName: "", relationship: "", phoneNumber: "" });
    expect(row.id).toBe("c1");
    expect(validateContactRows([row]).c1.firstName).toMatch(/remove/);
  });

  test("a saved contact keeps its id and fields", () => {
    const row = contactRowFromEntity({ id: "c2", ...complete, email: undefined });
    expect(row).toMatchObject({ key: "c2", id: "c2", ...complete, email: "" });
  });
});
