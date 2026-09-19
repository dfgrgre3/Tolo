import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockedApiClient } = vi.hoisted(() => {
  return {
    mockedApiClient: {
      get: vi.fn(),
      postJson: vi.fn(),
      fetch: vi.fn(),
    },
  };
});

vi.mock("@/lib/api/api-client", () => ({
  apiClient: mockedApiClient,
}));

import {
  getLessonTranscript,
  getLessonNotes,
  getLessonNoteItems,
  saveLessonNotes,
  fetchThumbnailVtt,
} from "@/services/api/lesson-content-service";

describe("lesson-content-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getLessonTranscript", () => {
    it("fetches transcript content for a lesson", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        content: "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nمرحباً",
      });

      const res = await getLessonTranscript("lesson-123");

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/courses/lessons/lesson-123/transcript");
      expect(res.content).toBe("WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nمرحباً");
    });

    it("returns empty object if payload is nullish", async () => {
      mockedApiClient.get.mockResolvedValueOnce(null);

      const res = await getLessonTranscript("lesson-456");

      expect(res).toEqual({});
    });
  });

  describe("getLessonNotes", () => {
    it("fetches timeline notes content for a lesson", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        content: "ملاحظات عامة\n[00:15] نقطة هامة",
      });

      const res = await getLessonNotes("lesson-123");

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/courses/lessons/lesson-123/notes");
      expect(res.content).toBe("ملاحظات عامة\n[00:15] نقطة هامة");
    });
  });

  describe("getLessonNoteItems", () => {
    it("fetches per-note items for a lesson", async () => {
      mockedApiClient.get.mockResolvedValueOnce({
        notes: [
          {
            id: "note-1",
            clientId: "client-1",
            time: 42,
            text: "Important note",
          },
        ],
      });

      const res = await getLessonNoteItems("lesson-123");

      expect(mockedApiClient.get).toHaveBeenCalledWith("/api/courses/lessons/lesson-123/notes/items");
      expect(res.notes).toHaveLength(1);
      const notes = res.notes ?? [];
      expect(notes[0]?.id).toBe("note-1");
    });
  });

  describe("saveLessonNotes", () => {
    it("persists timeline notes for a lesson via postJson", async () => {
      mockedApiClient.postJson.mockResolvedValueOnce({ success: true });

      await saveLessonNotes("lesson-123", "[00:15] نقطة هامة");

      expect(mockedApiClient.postJson).toHaveBeenCalledWith(
        "/api/courses/lessons/lesson-123/notes",
        { content: "[00:15] نقطة هامة" }
      );
    });
  });

  describe("fetchThumbnailVtt", () => {
    it("fetches thumbnail vtt using force-cache and returns text", async () => {
      mockedApiClient.fetch.mockResolvedValueOnce({
        ok: true,
        text: async () => "WEBVTT\n\n00:00:00.000 --> 00:00:05.000\nsprite.jpg#xywh=0,0,160,90",
      });

      const res = await fetchThumbnailVtt("https://cdn.example.com/thumbnails.vtt");

      expect(mockedApiClient.fetch).toHaveBeenCalledWith(
        "https://cdn.example.com/thumbnails.vtt",
        { cache: "force-cache" }
      );
      expect(res).toContain("sprite.jpg");
    });

    it("returns empty string when response is not ok", async () => {
      mockedApiClient.fetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Not Found",
      });

      const res = await fetchThumbnailVtt("https://cdn.example.com/404.vtt");

      expect(res).toBe("");
    });
  });
});
