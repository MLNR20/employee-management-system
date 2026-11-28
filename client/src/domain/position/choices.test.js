import { departmentChoices, positionChoices } from "./choices";

const departments = [
  { id: "d1", name: "Sales", isActive: true },
  { id: "d2", name: "Closed", isActive: false },
];
const positions = [
  { name: "Rep", departmentId: "d1", isActive: true },
  { name: "Lead", departmentId: "d1", isActive: true },
  { name: "Old title", departmentId: "d1", isActive: false },
  { name: "Elsewhere", departmentId: "d2", isActive: true },
];

test("active departments are offered, and the current one even when unlisted", () => {
  expect(departmentChoices(departments, "")).toEqual([{ name: "Sales", listed: true }]);
  expect(departmentChoices(departments, "Closed")).toEqual([
    { name: "Sales", listed: true },
    { name: "Closed", listed: false },
  ]);
});

test("positions come from the chosen department only", () => {
  expect(positionChoices(departments, positions, "Sales", "").map((p) => p.name)).toEqual(["Lead", "Rep"]);
  expect(positionChoices(departments, positions, "Sales", "Old title").pop()).toEqual({ name: "Old title", listed: false });
  expect(positionChoices(departments, positions, "", "Rep")).toEqual([]);
});
