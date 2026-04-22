import {
  DEFAULT_PLAYER_PREFERENCES,
  NOTES_TIMELINE_END,
  NOTES_TIMELINE_START,
  PLAYER_PREFERENCES_KEY,
} from "./constants";
import type {
  BookmarkItem,
  PlayerPreferences,
  ThumbnailCue,
  TimelineNote,
  VideoProvider,
} from "./types";

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function parseYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace("www.", "");
    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    if (host.includes("youtube.com")) {
      if (parsed.pathname.includes("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] ?? null;
      }
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return videoId;
      }
    }
  } catch {
    return null;
  }

  const fallbackMatch =
    /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([^?&#/]+)/i.exec(url);
  return fallbackMatch?.[1] ?? null;
}

export function getProvider(videoUrl: string): VideoProvider {
  if (!videoUrl) return "unknown";
  if (parseYouTubeId(videoUrl)) return "youtube";
  if (videoUrl.includes("bunnycdn.com") || videoUrl.includes("b-cdn.net")) {
    return "bunny";
  }
  if (videoUrl.includes("cloudflarestream.com")) {
    return "cloudflare";
  }
  return "html5";
}

export function shouldUseHls(videoUrl: string, provider: VideoProvider) {
  if (!videoUrl) return false;
  return (
    videoUrl.includes(".m3u8") ||
    provider === "bunny" ||
    provider === "cloudflare"
  );
}

export function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return "00:00";
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

export function formatWatchTime(totalSeconds: number) {
  if (totalSeconds < 60) {
    return `${totalSeconds} ث`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} د ${seconds} ث`;
}

export function readPlayerPreferences(): PlayerPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_PREFERENCES;
  }

  try {
    const rawPreferences = localStorage.getItem(PLAYER_PREFERENCES_KEY);
    return rawPreferences
      ? {
          ...DEFAULT_PLAYER_PREFERENCES,
          ...(JSON.parse(rawPreferences) as Partial<PlayerPreferences>),
        }
      : DEFAULT_PLAYER_PREFERENCES;
  } catch {
    return DEFAULT_PLAYER_PREFERENCES;
  }
}

export function formatSecondsToTimestamp(totalSeconds: number) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `[${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")}]`;
  }

  return `[${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}]`;
}

function parseTimestampToSeconds(timestamp: string) {
  const parts = timestamp.split(":").map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  return null;
}

export function parseCloudTimelineNotes(content: string) {
  const startIndex = content.indexOf(NOTES_TIMELINE_START);
  const endIndex = content.indexOf(NOTES_TIMELINE_END);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return { freeformContent: content, notes: [] as TimelineNote[] };
  }

  const freeformContent = content.slice(0, startIndex).trimEnd();
  const timelineBlock = content
    .slice(startIndex + NOTES_TIMELINE_START.length, endIndex)
    .trim();

  const notes = timelineBlock
    .split(/\r?\n/)
    .map((line, index) => {
      const match = /^\[(\d{2}(?::\d{2}){1,2})\]\s*(.+)$/.exec(line.trim());
      if (!match) return null;

      const time = parseTimestampToSeconds(match[1]);
      if (time === null) return null;

      return {
        id: `${time}-${index}-${match[2]}`,
        time,
        text: match[2],
        createdAt: Date.now() + index,
      } satisfies TimelineNote;
    })
    .filter((note): note is TimelineNote => note !== null);

  return { freeformContent, notes };
}

export function serializeCloudTimelineNotes(
  freeformContent: string,
  notes: TimelineNote[]
) {
  const normalizedFreeform = freeformContent.trim();
  const normalizedNotes = [...notes]
    .sort((left, right) => left.time - right.time)
    .map((note) => `${formatSecondsToTimestamp(note.time)} ${note.text.trim()}`)
    .join("\n");

  if (!normalizedNotes) {
    return normalizedFreeform;
  }

  const sections = [normalizedFreeform, NOTES_TIMELINE_START, normalizedNotes, NOTES_TIMELINE_END]
    .filter(Boolean)
    .join("\n\n");

  return sections.trim();
}

export function createTimelineNote(time: number, text: string): TimelineNote {
  const safeTime = Math.max(0, Math.floor(time));
  return {
    id: `${Date.now()}-${safeTime}`,
    time: safeTime,
    text: text.trim(),
    createdAt: Date.now(),
  };
}

function parseVttTimestamp(value: string) {
  const normalized = value.trim().split(".")[0];
  const parts = normalized.split(":").map((item) => Number(item));
  if (parts.some((item) => Number.isNaN(item))) {
    return null;
  }

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

export function parseThumbnailVtt(
  content: string,
  vttUrl: string
): ThumbnailCue[] {
  return content
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block && !block.startsWith("WEBVTT"))
    .map((block) => {
      const lines = block.split(/\r?\n/).map((line) => line.trim());
      const timeLine = lines.find((line) => line.includes("-->"));
      const assetLine = lines[lines.length - 1];

      if (!timeLine || !assetLine || assetLine.includes("-->")) {
        return null;
      }

      const [rawStart, rawEnd] = timeLine.split("-->").map((part) => part.trim());
      const start = parseVttTimestamp(rawStart.split(" ")[0] ?? rawStart);
      const end = parseVttTimestamp(rawEnd.split(" ")[0] ?? rawEnd);

      if (start === null || end === null) {
        return null;
      }

      const [path, fragment] = assetLine.split("#xywh=");
      const [x = 0, y = 0, width = 0, height = 0] = (fragment ?? "")
        .split(",")
        .map((value) => Number(value));

      return {
        start,
        end,
        imageUrl: new URL(path, vttUrl).toString(),
        x,
        y,
        width,
        height,
      } satisfies ThumbnailCue;
    })
    .filter((cue): cue is ThumbnailCue => cue !== null);
}

export function getThumbnailCueAtTime(
  cues: ThumbnailCue[],
  time: number
) {
  return cues.find((cue) => time >= cue.start && time < cue.end) ?? null;
}

export function mergeChapterMarkers(
  bookmarks: BookmarkItem[],
  chapterMarkers: BookmarkItem[]
) {
  const key = (item: BookmarkItem) => `${item.time}-${item.label}`;
  const unique = new Map<string, BookmarkItem>();

  [...chapterMarkers, ...bookmarks].forEach((item) => {
    unique.set(key(item), item);
  });

  return [...unique.values()].sort((left, right) => left.time - right.time);
}
