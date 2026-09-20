import { describe, it, expect, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  courseProgressKeys,
  reconcileCourseProgress,
} from "@/lib/state/state-ownership";

describe("state-ownership (P0-5)", () => {
  it("produces deterministic, hierarchical query keys", () => {
    expect(courseProgressKeys.detail("c-123")).toEqual(["courses", "detail", "c-123"]);
    expect(courseProgressKeys.learningHub("c-123")).toEqual(["courses", "learning-hub", "c-123"]);
    expect(courseProgressKeys.lessonProgress("l-456")).toEqual(["lesson-progress", "l-456"]);
  });

  it("reconciles course progress and lesson progress into React Query cache", () => {
    const queryClient = new QueryClient();

    // Seed initial cache
    queryClient.setQueryData(courseProgressKeys.detail("c-100"), {
      id: "c-100",
      title: "Physics",
      progress: 20,
      completion: { progress: 20, isComplete: false },
    });

    // Reconcile server response
    reconcileCourseProgress(queryClient, "c-100", {
      lessonId: "l-200",
      isCompleted: true,
      courseProgress: 50,
      isCourseComplete: false,
      certificateEligible: false,
    });

    // Verify cache updates
    const updatedCourse = queryClient.getQueryData<{
      progress?: number;
      completion?: { progress?: number };
    }>(courseProgressKeys.detail("c-100"));
    expect(updatedCourse?.progress).toBe(50);
    expect(updatedCourse?.completion?.progress).toBe(50);

    const lessonData = queryClient.getQueryData<{ completed?: boolean }>(
      courseProgressKeys.lessonProgress("l-200")
    );
    expect(lessonData?.completed).toBe(true);
  });
});
