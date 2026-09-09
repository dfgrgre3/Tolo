import { describe, expect, it } from "vitest";
import { buildProfilePatch, type ProfileFormState } from "@/app/(dashboard)/profile/_components/profile-patch";

const baseline: ProfileFormState = {
  name: "Ada", username: "ada", phone: "123", alternativePhone: "456",
  country: "Egypt", city: "Cairo", gender: "F", school: "School",
  gradeLevel: "3", educationType: "General", section: "A", birthDate: "2000-01-01",
  bio: "Bio", studyGoal: "Goal",
};

describe("profile patch builder", () => {
  it("sends an explicit empty string when an optional field is cleared", () => {
    expect(buildProfilePatch({ ...baseline, city: "" }, baseline)).toEqual({ city: "" });
    expect(buildProfilePatch({ ...baseline, birthDate: "" }, baseline)).toEqual({ birthDate: "" });
  });

  it("omits unchanged fields", () => {
    expect(buildProfilePatch(baseline, baseline)).toEqual({});
  });
});
