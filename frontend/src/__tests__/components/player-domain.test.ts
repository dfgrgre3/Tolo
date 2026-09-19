import { describe, expect, it } from "vitest";
import {
  computeProgressSnapshot,
  selectResumePosition,
} from "@/components/video/player/utils";
import {
  buildQualityOptions,
  qualityKeyForLevel,
} from "@/components/video/player/hooks/useHlsEngine";
import { deriveStartupStats } from "@/components/video/player/hooks/usePlayerTelemetry";
import { sanitizeQuestions } from "@/lib/lesson-questions";

// ─── P3-52: quality mapping (stable keys, never raw indexes) ───
describe("buildQualityOptions", () => {
  it("assigns stable keys with engine handles and bitrates", () => {
    const levels = [
      { height: 720, bitrate: 2_000_000 },
      { height: 1080, bitrate: 5_000_000 },
      { height: 1080, bitrate: 6_000_000 },
      { height: 0 },
    ];
    const options = buildQualityOptions(levels);
    // Duplicate heights dedupe to one key; unknown heights get level ids.
    expect(options.map((o) => o.key)).toEqual(["1080p", "720p", "level-3"]);
    expect(options.find((o) => o.key === "1080p")).toMatchObject({
      label: "1080p",
      levelIndex: 1,
    });
  });

  it("resolves engine indexes back to keys, auto for -1", () => {
    const options = buildQualityOptions([{ height: 480 }, { height: 720 }]);
    // Sorted desc: 720p (idx 1), 480p (idx 0).
    expect(qualityKeyForLevel(options, 1)).toBe("720p");
    expect(qualityKeyForLevel(options, 0)).toBe("480p");
    expect(qualityKeyForLevel(options, -1)).toBe("auto");
    expect(qualityKeyForLevel(options, 99)).toBe("auto");
  });
});

// ─── P3-52: progress math ───
describe("computeProgressSnapshot", () => {
  it("computes percent and the auto-complete threshold", () => {
    expect(computeProgressSnapshot(540, 600, 90)).toEqual({
      position: 540,
      percent: 90,
      completed: true,
    });
    expect(computeProgressSnapshot(100, 600, 90).completed).toBe(false);
  });

  it("clamps and guards degenerate input", () => {
    expect(computeProgressSnapshot(-5, 600, 90).position).toBe(0);
    expect(computeProgressSnapshot(999, 600, 90).position).toBe(600);
    expect(computeProgressSnapshot(10, 0, 90)).toEqual({
      position: 0,
      percent: 0,
      completed: false,
    });
  });
});

describe("selectResumePosition", () => {
  const base = {
    localTime: 100,
    localUpdatedAtMs: 1000,
    serverPosition: 200,
    serverUpdatedAtMs: 2000,
    duration: 600,
    minResumeSeconds: 5,
  };

  it("prefers the server position on newer-or-equal timestamps", () => {
    expect(selectResumePosition(base)).toBe(200);
    expect(selectResumePosition({ ...base, serverUpdatedAtMs: 500 })).toBe(100);
  });

  it("rejects edge positions and degenerate durations", () => {
    expect(selectResumePosition({ ...base, localTime: 2, serverPosition: null, serverUpdatedAtMs: 0 })).toBeNull();
    expect(selectResumePosition({ ...base, localTime: 598, serverPosition: null, serverUpdatedAtMs: 0 })).toBeNull();
    expect(selectResumePosition({ ...base, duration: 0 })).toBeNull();
  });
});

// ─── P3-53: server-trust sanitization ───
describe("sanitizeQuestions", () => {
  const graded = {
    id: "q-1",
    question: "2+2؟",
    options: ["3", "4"],
    correctOptionIndex: 1,
  };

  it("drops the answer key unless explicitly formative", () => {
    expect(sanitizeQuestions([graded])[0]).not.toHaveProperty("correctOptionIndex");
    expect(
      sanitizeQuestions([{ ...graded, validation: "formative" as const }])[0]
    ).toHaveProperty("correctOptionIndex", 1);
  });

  it("leaves server-mode questions untouched", () => {
    const server = { id: "q-2", question: "؟", options: ["a", "b"] };
    expect(sanitizeQuestions([server])[0]).toEqual(server);
  });
});

// ─── P3-54: startup stats derivation ───
describe("deriveStartupStats", () => {
  const event = (type: "player_initialized" | "source_loaded" | "first_frame", at: number) => ({
    type,
    at,
    lessonId: "l-1",
    courseId: "c-1",
    provider: "html5" as const,
  });

  it("derives time-to-ready and time-to-first-frame", () => {
    const stats = deriveStartupStats([
      event("player_initialized", 1000),
      event("source_loaded", 1500),
      event("first_frame", 1800),
    ]);
    expect(stats).toEqual({ timeToReadyMs: 500, timeToFirstFrameMs: 800 });
  });

  it("returns nulls for milestones that never happened", () => {
    expect(deriveStartupStats([event("player_initialized", 1000)])).toEqual({
      timeToReadyMs: null,
      timeToFirstFrameMs: null,
    });
    expect(deriveStartupStats([])).toEqual({
      timeToReadyMs: null,
      timeToFirstFrameMs: null,
    });
  });
});
