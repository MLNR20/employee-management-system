import { emptyValue, initialValuesFor, toPayload, validateFields } from "./formRules";

const days = {
  name: "workDays",
  label: "Working days",
  type: "checkboxes",
  required: true,
  default: [1, 2, 3, 4, 5],
  options: [{ value: 0, label: "Sun" }, { value: 1, label: "Mon" }],
};

test("a checkboxes field starts from its default, or empty", () => {
  expect(emptyValue(days)).toEqual([1, 2, 3, 4, 5]);
  expect(emptyValue({ type: "checkboxes" })).toEqual([]);
  expect(initialValuesFor([days], { workDays: [0, 6] })).toEqual({ workDays: [0, 6] });
  expect(initialValuesFor([days], undefined)).toEqual({ workDays: [1, 2, 3, 4, 5] });
});

test("a required checkboxes field needs at least one choice, and sends the array through", () => {
  expect(validateFields([days], { workDays: [] })).toEqual({ workDays: "Working days is required." });
  expect(validateFields([days], { workDays: [0] })).toEqual({});
  expect(toPayload([days], { workDays: [6, 1] })).toEqual({ workDays: [6, 1] });
});
