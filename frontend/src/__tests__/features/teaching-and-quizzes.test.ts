import { describe, it, expect } from "vitest";
import {
  contractListTeachingCourses,
  contractCreateTeachingCourse,
  useTeachingData,
} from "@/features/teaching";
import {
  useCourseQuizzes,
  useLessonQuizzes,
  useCourseQuiz,
  useQuizResults,
  courseQuizRepository,
} from "@/features/quizzes";

describe("features/teaching and features/quizzes Domain Boundaries (P0-12 / P0-14)", () => {
  describe("features/teaching", () => {
    it("exports typed contract API services", () => {
      expect(contractListTeachingCourses).toBeInstanceOf(Function);
      expect(contractCreateTeachingCourse).toBeInstanceOf(Function);
    });

    it("exports hooks", () => {
      expect(useTeachingData).toBeInstanceOf(Function);
    });
  });

  describe("features/quizzes", () => {
    it("exports repository API gateway", () => {
      expect(courseQuizRepository).toBeDefined();
      expect(courseQuizRepository.getCourseQuizzes).toBeInstanceOf(Function);
    });

    it("exports query & mutation hooks", () => {
      expect(useCourseQuizzes).toBeInstanceOf(Function);
      expect(useLessonQuizzes).toBeInstanceOf(Function);
      expect(useCourseQuiz).toBeInstanceOf(Function);
      expect(useQuizResults).toBeInstanceOf(Function);
    });
  });
});
