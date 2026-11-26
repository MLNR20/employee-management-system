import { employmentStage, rehireTagLabel, validateSeparation } from "./separation";

test("only someone who has left, or is leaving, is expected to be tagged", () => {
  expect(rehireTagLabel({ rehireStatus: "", isActive: true, separation: null })).toBe("");
  expect(rehireTagLabel({ rehireStatus: "", isActive: false, separation: null })).toBe("Not tagged");
  expect(rehireTagLabel({ rehireStatus: "", isActive: true, separation: { status: "in_progress" } })).toBe("Not tagged");
  expect(rehireTagLabel({ rehireStatus: "rehireable", isActive: false })).toBe("Rehireable");
  expect(rehireTagLabel({ rehireStatus: "non_rehireable", isActive: false })).toBe("Non-rehireable");
});

test("an employee's stage follows their offboarding", () => {
  expect(employmentStage({ isActive: true, separation: null })).toBe("active");
  expect(employmentStage({ isActive: false, separation: null })).toBe("inactive");
  expect(employmentStage({ isActive: true, separation: { status: "in_progress" } })).toBe("offboarding");
  expect(employmentStage({ isActive: false, separation: { status: "completed" } })).toBe("offboarded");
});

test("the offboarding form needs a type, a day and a reason for non-rehireable", () => {
  expect(Object.keys(validateSeparation({}))).toEqual(["separationType", "lastWorkingDay"]);
  const filled = { separationType: "resignation", lastWorkingDay: "2026-03-02" };
  expect(validateSeparation(filled)).toEqual({});
  expect(validateSeparation({ ...filled, rehireStatus: "non_rehireable", rehireNotes: " " })).toHaveProperty("rehireNotes");
  expect(validateSeparation({ ...filled, rehireStatus: "non_rehireable", rehireNotes: "Fraud" })).toEqual({});
});
