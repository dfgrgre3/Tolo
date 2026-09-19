import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseTranscript } from "@/components/video/player/utils";
import {
  parseCloudTimelineNotes,
  serializeCloudTimelineNotes,
} from "@/components/video/player/utils";
import { parseThumbnailVtt } from "@/components/video/player/utils";

// ─── P3-53: content-driven inputs must never become executable ───
describe("transcript XSS resistance", () => {
  it("strips script tags and event-handler attributes from cues", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:00:01.000 --> 00:00:02.000",
      '<img src=x onerror="alert(1)">نص',
      "",
      "00:00:03.000 --> 00:00:04.000",
      "<script>alert(2)</script>نص ثانٍ",
    ].join("\n");
    const cues = parseTranscript(vtt);
    expect(cues).toHaveLength(2);
    for (const cue of cues) {
      expect(cue.text).not.toContain("<script");
      expect(cue.text).not.toContain("onerror");
      expect(cue.text).not.toContain("<img");
    }
    expect(cues[0]?.text).toContain("نص");
  });

  it("keeps javascript: URLs out of cue text", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\n<a href=\"javascript:alert(1)\">اضغط</a>";
    const text = parseTranscript(vtt)[0]?.text ?? "";
    expect(text).not.toContain("javascript:");
    expect(text).toContain("اضغط");
  });
});

describe("notes XSS resistance", () => {
  it("round-trips markup as inert TEXT (renderers must use text nodes)", () => {
    const evil = '<img src=x onerror="alert(1)"> ملاحظة';
    const serialized = serializeCloudTimelineNotes("", [
      { id: "n-1", time: 95, text: evil },
    ]);
    const { notes } = parseCloudTimelineNotes(serialized);
    // The payload layer preserves text exactly; safety comes from never
    // interpreting it as HTML — enforced by the surface test below.
    expect(notes[0]?.text).toBe(evil);
  });
});

describe("thumbnail manifest abuse", () => {
  it("skips cues with javascript: URLs instead of failing the manifest", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:00:00.000 --> 00:00:10.000",
      "javascript:alert(1)#xywh=0,0,100,100",
      "",
      "00:00:10.000 --> 00:00:20.000",
      "thumbs.jpg#xywh=0,0,100,100",
    ].join("\n");
    const cues = parseThumbnailVtt(vtt, "https://cdn.example.com/vtt/");
    expect(cues).toHaveLength(1);
    expect(cues[0]?.imageUrl).toContain("thumbs.jpg");
  });
});

describe("player XSS surface (static)", () => {
  const playerDir = path.resolve(__dirname, "../../components/video");

  function collectFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      return entry.isDirectory() ? collectFiles(full) : [full];
    });
  }

  it("renders no content-driven HTML: dangerouslySetInnerHTML appears only for the internal cue-CSS block", () => {
    const offenders: string[] = [];
    for (const file of collectFiles(playerDir)) {
      if (!/\.(tsx?|jsx?)$/.test(file)) continue;
      const content = fs.readFileSync(file, "utf8");
      if (!content.includes("dangerouslySetInnerHTML")) continue;
      // The single allowed case: CourseVideoPlayer's <style> tag whose
      // values come from a fixed size map + a clamped numeric opacity —
      // never from notes/transcript/markers/titles.
      const isCueCssBlock =
        file.endsWith("CourseVideoPlayer.tsx") && content.includes("video::cue");
      if (!isCueCssBlock) offenders.push(path.relative(playerDir, file));
    }
    expect(offenders).toEqual([]);
  });
});
