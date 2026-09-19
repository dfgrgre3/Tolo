import { describe, it, expect } from "vitest";
import {
  getLessonTranscript,
  getLessonNoteItems,
  getLessonNotes,
  saveLessonNotes,
  fetchThumbnailVtt,
  useLearningHub,
  CourseVideoPlayer,
} from "@/features/learning";

describe("features/learning Domain Boundary (P0-12 / P0-14)", () => {
  it("exports typed lesson content API operations", () => {
    expect(getLessonTranscript).toBeInstanceOf(Function);
    expect(getLessonNoteItems).toBeInstanceOf(Function);
    expect(getLessonNotes).toBeInstanceOf(Function);
    expect(saveLessonNotes).toBeInstanceOf(Function);
    expect(fetchThumbnailVtt).toBeInstanceOf(Function);
  });

  it("exports learning hub hook", () => {
    expect(useLearningHub).toBeInstanceOf(Function);
  });

  it("exports CourseVideoPlayer component", () => {
    expect(CourseVideoPlayer).toBeDefined();
  });
});
