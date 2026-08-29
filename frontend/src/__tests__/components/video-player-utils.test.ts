import { describe, it, expect } from "vitest";
import {
  clamp,
  parseYouTubeId,
  getProvider,
  shouldUseHls,
  formatDuration,
  formatWatchTime,
  formatSecondsToTimestamp,
  parseCloudTimelineNotes,
  serializeCloudTimelineNotes,
  createTimelineNote,
  parseTranscript,
  getThumbnailCueAtTime,
  mergeChapterMarkers,
  readPlayerPreferences,
} from "@/components/video/player/utils";
import {
  NOTES_TIMELINE_START,
  NOTES_TIMELINE_END,
  PLAYER_PREFERENCES_KEY,
} from "@/components/video/player/constants";

const TL_START = NOTES_TIMELINE_START;
const TL_END = NOTES_TIMELINE_END;

// ─── clamp ─────────────────────────────────────────────────────────────────
describe("clamp", () => {
  it("keeps values inside the range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it("clamps below the minimum", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  it("clamps above the maximum", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

// ─── parseYouTubeId ────────────────────────────────────────────────────────
describe("parseYouTubeId", () => {
  it("extracts the id from a watch URL", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a youtu.be short link", () => {
    expect(parseYouTubeId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from an embed URL", () => {
    expect(parseYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("strips extra query params and fragments", () => {
    expect(parseYouTubeId("https://www.youtube.com/watch?v=abc123&t=30s")).toBe("abc123");
    expect(parseYouTubeId("https://youtu.be/abc123?si=xyz")).toBe("abc123");
  });

  it("returns null for non-YouTube URLs", () => {
    expect(parseYouTubeId("https://example.com/video")).toBeNull();
    expect(parseYouTubeId("https://vimeo.com/12345")).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(parseYouTubeId("not a url")).toBeNull();
    expect(parseYouTubeId("")).toBeNull();
  });
});

// ─── getProvider / shouldUseHls ────────────────────────────────────────────
describe("getProvider", () => {
  it("detects youtube", () => {
    expect(getProvider("https://youtu.be/abc")).toBe("youtube");
  });

  it("detects bunny", () => {
    expect(getProvider("https://vz-abc.b-cdn.net/lesson.m3u8")).toBe("bunny");
    expect(getProvider("https://bunnycdn.com/lesson.mp4")).toBe("bunny");
  });

  it("detects cloudflare stream", () => {
    expect(getProvider("https://customer-x.cloudflarestream.com/abc/manifest/video.m3u8")).toBe("cloudflare");
  });

  it("falls back to html5 for plain video files", () => {
    expect(getProvider("https://storage.example.com/lesson.mp4")).toBe("html5");
  });

  it("returns unknown for empty input", () => {
    expect(getProvider("")).toBe("unknown");
  });
});

describe("shouldUseHls", () => {
  it("true for .m3u8 playlists regardless of provider", () => {
    expect(shouldUseHls("https://x.com/video.m3u8", "html5")).toBe(true);
  });

  it("true for bunny and cloudflare providers", () => {
    expect(shouldUseHls("https://x.com/video.mp4", "bunny")).toBe(true);
    expect(shouldUseHls("https://x.com/video.mp4", "cloudflare")).toBe(true);
  });

  it("false for plain mp4 on html5", () => {
    expect(shouldUseHls("https://x.com/video.mp4", "html5")).toBe(false);
  });

  it("false for empty url", () => {
    expect(shouldUseHls("", "bunny")).toBe(false);
  });
});

// ─── التنسيقات ────────────────────────────────────────────────────────────
describe("formatDuration", () => {
  it("zero and invalid input render 00:00", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(-10)).toBe("00:00");
    expect(formatDuration(Number.NaN)).toBe("00:00");
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe("00:00");
  });

  it("renders MM:SS under an hour", () => {
    expect(formatDuration(65)).toBe("01:05");
  });

  it("renders HH:MM:SS at an hour or more", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });
});

describe("formatWatchTime (Arabic units)", () => {
  it("renders seconds", () => {
    expect(formatWatchTime(45)).toBe("45 ث");
  });

  it("renders minutes + seconds", () => {
    expect(formatWatchTime(125)).toBe("2 د 5 ث");
  });

  it("renders hours + minutes", () => {
    expect(formatWatchTime(7325)).toBe("2 س 2 د");
  });

  it("floors negative input to zero", () => {
    expect(formatWatchTime(-5)).toBe("0 ث");
  });
});

describe("formatSecondsToTimestamp", () => {
  it("bracketed MM:SS", () => {
    expect(formatSecondsToTimestamp(95)).toBe("[01:35]");
  });

  it("bracketed HH:MM:SS", () => {
    expect(formatSecondsToTimestamp(3661)).toBe("[01:01:01]");
  });

  it("floors negative input", () => {
    expect(formatSecondsToTimestamp(-3)).toBe("[00:00]");
  });
});

// ─── ملاحظات الخط الزمني (round-trip) ────────────────────────────────────
describe("timeline notes parse/serialize", () => {
  it("returns the content unchanged with no notes block", () => {
    const { freeformContent, notes } = parseCloudTimelineNotes("وصف الدرس فقط");
    expect(freeformContent).toBe("وصف الدرس فقط");
    expect(notes).toEqual([]);
  });

  it("parses notes from the timeline block", () => {
    const content = `مقدمة\n\n${TL_START}\n[02:30] نقطة مهمة\n[10:00] خاتمة\n${TL_END}`;
    const { freeformContent, notes } = parseCloudTimelineNotes(content);

    expect(freeformContent).toBe("مقدمة");
    expect(notes).toHaveLength(2);
    expect(notes[0]).toMatchObject({ time: 150, text: "نقطة مهمة" });
    expect(notes[1]).toMatchObject({ time: 600, text: "خاتمة" });
  });

  it("ignores malformed note lines", () => {
    const content = `${TL_START}\nليست ملاحظة\n[05:00] صالحة\n${TL_END}`;
    const { notes } = parseCloudTimelineNotes(content);
    expect(notes).toHaveLength(1);
    expect(notes[0]?.text).toBe("صالحة");
  });

  it("round-trips serialize(parse(content))", () => {
    const original = `شرح\n\n${TL_START}\n[01:00] الأولى\n[00:30] الثانية\n${TL_END}`;
    const { freeformContent, notes } = parseCloudTimelineNotes(original);
    const serialized = serializeCloudTimelineNotes(freeformContent, notes);
    const reparsed = parseCloudTimelineNotes(serialized);

    // الترتيب يُطبَّع زمنياً عند التسلسل
    expect(reparsed.notes.map((n) => n.text)).toEqual(["الثانية", "الأولى"]);
    expect(reparsed.freeformContent).toBe("شرح");
  });

  it("serialization drops the notes block when empty", () => {
    expect(serializeCloudTimelineNotes("وصف", [])).toBe("وصف");
  });
});

describe("createTimelineNote", () => {
  it("floors time and trims text", () => {
    const note = createTimelineNote(95.7, "  نص  ");
    expect(note.time).toBe(95);
    expect(note.text).toBe("نص");
    expect(note.id).toContain("95");
  });
});

// ─── النصوص (SRT + VTT) ───────────────────────────────────────────────────
describe("parseTranscript", () => {
  it("parses VTT with header", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:03.500\nمرحباً بكم";
    const cues = parseTranscript(vtt);
    expect(cues).toHaveLength(1);
    expect(cues[0]).toMatchObject({ start: 1, end: 3.5, text: "مرحباً بكم" });
  });

  it("parses SRT with comma ms separator and index lines", () => {
    const srt = "1\n00:00:02,000 --> 00:00:04,000\nالسطر الأول\n\n2\n00:00:05,000 --> 00:00:06,000\nالسطر الثاني";
    const cues = parseTranscript(srt);
    expect(cues).toHaveLength(2);
    expect(cues[1]?.text).toBe("السطر الثاني");
  });

  it("strips inline styling tags from VTT text", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<b>عريض</b> عادي";
    const cues = parseTranscript(vtt);
    expect(cues[0]?.text).toBe("عريض عادي");
  });

  it("drops blocks without a timing line", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nصالح\n\nكتلة بدون توقيت";
    const cues = parseTranscript(vtt);
    expect(cues).toHaveLength(1);
  });

  it("returns empty for garbage", () => {
    expect(parseTranscript("")).toEqual([]);
    expect(parseTranscript("لا يوجد أي توقيت هنا")).toEqual([]);
  });
});

// ─── الصور المصغرة والفصول ─────────────────────────────────────────────────
describe("getThumbnailCueAtTime", () => {
  const cues = [
    { start: 0, end: 10, imageUrl: "a.jpg", x: 0, y: 0, width: 100, height: 50 },
    { start: 10, end: 20, imageUrl: "b.jpg", x: 0, y: 0, width: 100, height: 50 },
  ];

  it("finds the cue covering the time (start-inclusive)", () => {
    expect(getThumbnailCueAtTime(cues, 0)?.imageUrl).toBe("a.jpg");
    expect(getThumbnailCueAtTime(cues, 9.9)?.imageUrl).toBe("a.jpg");
    expect(getThumbnailCueAtTime(cues, 10)?.imageUrl).toBe("b.jpg");
  });

  it("returns null outside all cues", () => {
    expect(getThumbnailCueAtTime(cues, 20)).toBeNull();
    expect(getThumbnailCueAtTime(cues, -1)).toBeNull();
  });
});

describe("mergeChapterMarkers", () => {
  const bookmark = { time: 60, label: "علامة" };
  const chapter = { time: 30, label: "فصل" };
  const duplicateChapter = { time: 30, label: "فصل" };

  it("merges, deduplicates and sorts by time", () => {
    const merged = mergeChapterMarkers([bookmark], [chapter, duplicateChapter]);
    expect(merged).toHaveLength(2);
    expect(merged[0]?.time).toBe(30);
    expect(merged[1]?.time).toBe(60);
  });
});

describe("readPlayerPreferences", () => {
  it("returns defaults when nothing is stored", () => {
    localStorage.clear();
    const prefs = readPlayerPreferences();
    expect(prefs).toBeTruthy();
    expect(typeof prefs).toBe("object");
  });

  it("merges stored values over the defaults", () => {
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify({ playbackSpeed: 1.5 }));
    const prefs = readPlayerPreferences();
    expect(prefs).toMatchObject({ playbackSpeed: 1.5 });
  });

  it("falls back to defaults on corrupted JSON", () => {
    localStorage.setItem(PLAYER_PREFERENCES_KEY, "{ هذا ليس JSON");
    expect(() => readPlayerPreferences()).not.toThrow();
  });
});
