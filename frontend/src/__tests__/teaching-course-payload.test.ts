import { describe, expect, it } from "vitest";
import {
  buildCourseUpdateBody,
  mapTeachingLesson,
  reorderTeachingLessons,
  toTeachingStatusTransport,
} from "@/app/teaching/hooks/use-teaching-data";

describe("teaching course payload", () => {
  it("maps canonical course lifecycle values only at the transport boundary", () => {
    expect(toTeachingStatusTransport("UNDER_REVIEW")).toBe("under_review");
    expect(buildCourseUpdateBody({ status: "ARCHIVED" })).toMatchObject({ status: "archived" });
  });

  it("includes level when updating a course", () => {
    expect(buildCourseUpdateBody({ level: "ADVANCED" })).toEqual({ level: "ADVANCED" });
  });

  it("preserves canonical lesson vocabulary", () => {
    expect(mapTeachingLesson({
      id: "lesson-1",
      title: "Lesson",
      type: "VIDEO",
      videoUrl: "https://cdn.example/video.m3u8",
      content: "body",
      examId: "exam-1",
      isFree: true,
      durationMinutes: 10,
      order: 2,
      attachments: [],
    })).toMatchObject({
      videoUrl: "https://cdn.example/video.m3u8",
      content: "body",
      examId: "exam-1",
      isFree: true,
    });
  });

  it("keeps lesson order aligned after moving a lesson", () => {
    const lessons = ["A", "B", "C"].map((title, index) => ({
      id: title,
      title,
      type: "VIDEO" as const,
      order: index + 1,
    }));

    const reordered = reorderTeachingLessons(lessons, 2, "up");

    expect(reordered.map((lesson) => lesson.title)).toEqual(["A", "C", "B"]);
    expect(reordered.map((lesson) => lesson.order)).toEqual([1, 2, 3]);
    expect(reordered.map(mapTeachingLesson).map((lesson) => lesson.order)).toEqual([1, 2, 3]);
    expect(buildCourseUpdateBody({
      chapters: [{ id: "chapter-1", title: "Chapter", lessons: reordered }],
    }).chapters).toEqual([{
      id: "chapter-1",
      title: "Chapter",
      lessons: reordered.map(mapTeachingLesson),
    }]);
  });
});
