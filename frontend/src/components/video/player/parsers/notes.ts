/**
 * Timeline-notes blob parser (P3-55 — extracted from utils.ts).
 *
 * Legacy whole-lesson serialization: freeform text + a delimited
 * "[hh:mm:ss] note" block. New code should prefer the per-note item API
 * (useTimelineNotes); this module stays for the blob fallback + migration.
 */
import { NOTES_TIMELINE_END, NOTES_TIMELINE_START } from "../constants";
import { formatSecondsToTimestamp } from "../utils";
import type { TimelineNote } from "../types";

function parseTimestampToSeconds(timestamp: string) {
  const parts = timestamp.split(":").map((value) => Number(value));
  if (parts.some((value) => Number.isNaN(value))) {
    return null;
  }

  if (parts.length === 2) {
    return parts[0]! * 60 + parts[1]!;
  }

  if (parts.length === 3) {
    return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
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
      const match = /^\[(\d{2}(?::\d{2}){1,2})\]\s*(\S.*)$/.exec(line.trim());
      if (!match) return null;

      const time = parseTimestampToSeconds(match[1]!);
      if (time === null) return null;

      return {
        id: `${time}-${index}-${match[2]!}`,
        time,
        text: match[2]!,
        createdAt: Date.now() + index,
      } as TimelineNote;
    })
    .filter((note) => note !== null) as TimelineNote[];

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

  const sections = [
    normalizedFreeform,
    NOTES_TIMELINE_START,
    normalizedNotes,
    NOTES_TIMELINE_END,
  ]
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
