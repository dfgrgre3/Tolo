import { describe, expect, it } from "vitest";
import { buildCourseUpdateBody, mapTeachingLesson } from "@/app/teaching/hooks/use-teaching-data";

describe("teaching course payload", () => {
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
});
