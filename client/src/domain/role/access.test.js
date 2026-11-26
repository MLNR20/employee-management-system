import { allows, resourceAccess } from "./access";
import { validatePasswordChange } from "../auth/passwordRules";

test("a permission is allowed when held, any one of a list counts, and nothing required is open", () => {
  expect(allows(["employees:view"], "employees:view")).toBe(true);
  expect(allows(["employees:view"], "employees:edit")).toBe(false);
  expect(allows(["employees:view"], ["departments:view", "employees:view"])).toBe(true);
  expect(allows(undefined, "employees:view")).toBe(false);
  expect(allows([], undefined)).toBe(true);
});

test("a resource uses its module's permissions unless it says otherwise", () => {
  expect(resourceAccess({ key: "inventory" })).toEqual({
    view: "inventory:view",
    create: "inventory:create",
    edit: "inventory:edit",
    remove: "inventory:delete",
  });
  expect(resourceAccess({ key: "salary-rates", access: { create: "salary-rates:assign" } }).create).toBe("salary-rates:assign");
});

test("changing a password needs the current one, a long enough new one and a matching copy", () => {
  expect(Object.keys(validatePasswordChange({}))).toEqual(["currentPassword", "newPassword"]);
  const change = { currentPassword: "old-pass-1", newPassword: "new-pass-1", confirmPassword: "new-pass-1" };
  expect(validatePasswordChange(change)).toEqual({});
  expect(validatePasswordChange({ ...change, confirmPassword: "new-pass-2" })).toHaveProperty("confirmPassword");
  expect(validatePasswordChange({ ...change, newPassword: "old-pass-1", confirmPassword: "old-pass-1" })).toHaveProperty("newPassword");
  expect(validatePasswordChange({ ...change, newPassword: "short", confirmPassword: "short" })).toHaveProperty("newPassword");
});
