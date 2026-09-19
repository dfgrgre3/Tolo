import { describe, it, expect } from "vitest";
import {
  contractListCourses,
  contractGetCourse,
  useCourses,
  useCourse,
  toCanonicalCourse,
  toTeachingMutationPayload,
  CourseCard,
  CoursesList,
  CoursesControls,
} from "@/features/courses";

describe("features/courses Domain Boundary (P0-12 / P0-14)", () => {
  it("exports typed contract API services", () => {
    expect(contractListCourses).toBeInstanceOf(Function);
    expect(contractGetCourse).toBeInstanceOf(Function);
  });

  it("exports hooks backed by contracts and query profiles", () => {
    expect(useCourses).toBeInstanceOf(Function);
    expect(useCourse).toBeInstanceOf(Function);
  });

  it("exports canonical domain models and adapters", () => {
    expect(toCanonicalCourse).toBeInstanceOf(Function);
    expect(toTeachingMutationPayload).toBeInstanceOf(Function);

    const canonical = toCanonicalCourse({
      id: "c1",
      title: "Physics 101",
      price: 200,
      sections: [],
    });
    expect(canonical.id).toBe("c1");
    expect(canonical.title).toBe("Physics 101");
    expect(canonical.pricing.price).toBe(200);
  });

  it("exports UI presentation components", () => {
    expect(CourseCard).toBeDefined();
    expect(CoursesList).toBeDefined();
    expect(CoursesControls).toBeDefined();
  });
});
