/**
 * Thumbnail-sprite VTT parser (P3-55 — extracted from utils.ts).
 *
 * Per-cue fault isolation: one malformed cue (bad timestamp, unresolvable
 * URL, broken sprite fragment) skips THAT cue instead of throwing the whole
 * manifest away.
 */
import type { ThumbnailCue } from "../types";

function parseVttTimestamp(value: string) {
  const normalized = value.trim().split(".")[0]!;
  const parts = normalized.split(":").map((item) => Number(item));
  if (parts.some((item) => Number.isNaN(item))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  }

  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }

  return null;
}

export function parseThumbnailVtt(
  content: string,
  vttUrl: string
): ThumbnailCue[] {
  const cues: ThumbnailCue[] = [];
  for (const rawBlock of content.split(/\r?\n\r?\n/)) {
    try {
      const cue = parseThumbnailCue(rawBlock, vttUrl);
      if (cue) cues.push(cue);
    } catch {
      continue;
    }
  }
  return cues;
}

function parseThumbnailCue(rawBlock: string, vttUrl: string): ThumbnailCue | null {
  const block = rawBlock.trim();
  if (!block || block.startsWith("WEBVTT")) return null;

  const lines = block.split(/\r?\n/).map((line) => line.trim());
  // Optional cue identifier: the timing line may be second.
  const timeLine = lines.find((line) => line.includes("-->"));
  const assetLine = lines[lines.length - 1];

  if (!timeLine || !assetLine || assetLine.includes("-->")) {
    return null;
  }

  const [rawStart, rawEnd] = timeLine.split("-->").map((part) => part.trim());
  const start = parseVttTimestamp((rawStart ?? "").split(" ")[0] ?? rawStart ?? "");
  const end = parseVttTimestamp((rawEnd ?? "").split(" ")[0] ?? rawEnd ?? "");

  if (start === null || end === null || end <= start) {
    return null;
  }

  const [path, fragment] = assetLine.split("#xywh=");
  if (!path) return null;
  let imageUrl: string;
  try {
    const parsed = new URL(path, vttUrl);
    // P3-53: scheme allowlist — javascript:/data: URLs parse fine with the
    // URL constructor, so construction alone proves nothing. Thumbnails are
    // subresource images: http(s) only.
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    imageUrl = parsed.toString();
  } catch {
    return null;
  }
  const [x = 0, y = 0, width = 0, height = 0] = (fragment ?? "")
    .split(",")
    .map((value) => Number(value));

  return {
    start,
    end,
    imageUrl,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

export function getThumbnailCueAtTime(cues: ThumbnailCue[], time: number) {
  return cues.find((cue) => time >= cue.start && time < cue.end) ?? null;
}
