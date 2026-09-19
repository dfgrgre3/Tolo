/**
 * Transcript parsers: SRT/VTT cues + Arabic-normalized search
 * (P3-55 — extracted from utils.ts).
 */
import type { BookmarkItem, TranscriptCue } from "../types";

// Parses SRT ("00:01:02,500") or VTT ("00:01:02.500" / "01:02.500")
// timestamps with sub-second precision.
const TRANSCRIPT_STAMP_RE = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

export function parseTranscriptTimestamp(value: string): number | null {
  const match = TRANSCRIPT_STAMP_RE.exec(value.trim());
  if (!match) return null;
  const [, h, m, s, ms] = match;
  // h includes its trailing colon ("01:") — strip it before Number().
  const hours = h ? Number(h.replace(":", "")) : 0;
  const minutes = Number(m);
  const seconds = Number(s);
  const millis = Number((ms ?? "0").padEnd(3, "0")) / 1000;
  if (![hours, minutes, seconds, millis].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds + millis;
}

// Matches a WebVTT/SRT timing line. Cue SETTINGS after the end timestamp
// (align:start position:0% …) are accepted and ignored — the regex anchors
// on the two timestamps only.
const TIMING_LINE_RE =
  /(\d{1,2}:\d{1,2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,2}:\d{1,2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})/;

const HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeTranscriptEntities(text: string): string {
  return text
    .replace(/&#(\d{1,5});/g, (_, code: string) => {
      const point = Number(code);
      return Number.isSafeInteger(point) ? String.fromCodePoint(point) : "";
    })
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_, hex: string) =>
      String.fromCodePoint(parseInt(hex, 16))
    )
    .replace(/&([a-zA-Z]+);/g, (full, name: string) => HTML_ENTITIES[name] ?? full);
}

/**
 * Parser-aware payload cleaning (P1-21): NOT a blind /<[^>]+>/ strip.
 * - Voice tags `<v Speaker>…</v>` → inner speech (speaker name dropped).
 * - Timestamp tags `<00:01.000>` → removed.
 * - Styling tags `<b> <i> <u> <c.colorE> <ruby>…` → inner text kept.
 * - A literal "<3" or "a < b" (no valid tag shape) is preserved as text.
 */
function cleanCuePayload(raw: string): string {
  let text = raw.replace(/<v\s+[^>]*>([\s\S]*?)<\/v\s*>/gi, "$1");
  text = text.replace(/<\d{1,2}:\d{2}(?::\d{2})?[.,]\d{1,3}>/g, "");
  text = text.replace(/<\/?[a-zA-Z][^<>]*>/g, "");
  text = decodeTranscriptEntities(text);
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Production-grade SRT/VTT cue parser (P1-21).
 *
 * Timing-line driven (not blank-line driven), so it recovers from:
 * - WEBVTT header + metadata, STYLE / REGION / NOTE blocks
 * - Cue identifiers (SRT numeric indexes, WebVTT string ids)
 * - Missing blank lines between cues (a new timing line ends the payload)
 * - Malformed cues (skipped individually — one bad cue never kills the file)
 * - Overlapping cues (accepted as-is; renderers pick by currentTime)
 * - garbage lines anywhere (skipped, scanning resumes at the next line)
 */
export function parseTranscript(content: string): TranscriptCue[] {
  if (!content || !content.trim()) return [];
  const lines = content.replace(/^\uFEFF/, "").split(/\r\n|\r|\n/);
  const cues: TranscriptCue[] = [];

  const collectFrom = (timingIndex: number): number => {
    const timing = TIMING_LINE_RE.exec(lines[timingIndex]!.trim());
    if (!timing) return timingIndex + 1;
    const start = parseTranscriptTimestamp(timing[1] ?? "");
    const end = parseTranscriptTimestamp(timing[2] ?? "");
    // Malformed timing (end <= start, unparseable) → skip this cue only.
    if (start === null || end === null || end <= start) {
      return timingIndex + 1;
    }
    const payload: string[] = [];
    let j = timingIndex + 1;
    while (j < lines.length) {
      const text = lines[j]!.trim();
      // Blank line ends the cue; a fresh timing line starts the next one
      // even without a blank separator. NOTE: a non-timing line just before
      // a timing line is PAYLOAD of this cue, not an identifier of the next
      // (identifiers are only recognized at block starts in the main scan) —
      // preserving text beats dropping it when separators are missing.
      if (text === "") return pushCue(cues, start, end, payload) && j + 1;
      if (TIMING_LINE_RE.test(text)) break;
      payload.push(lines[j]!);
      j += 1;
    }
    pushCue(cues, start, end, payload);
    return j;
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (line === "" || /^WEBVTT(\s|$)/i.test(line) || line === "STYLE" || line === "REGION") {
      i += 1;
      continue;
    }
    if (/^NOTE(\s|$)/.test(line)) {
      // NOTE blocks run to the next blank line (or a timing line, defensively).
      i += 1;
      while (i < lines.length && lines[i]!.trim() !== "" && !TIMING_LINE_RE.test(lines[i]!.trim())) i += 1;
      continue;
    }
    if (TIMING_LINE_RE.test(line)) {
      i = collectFrom(i);
      continue;
    }
    // Possible cue identifier: only consume it when a timing line follows.
    const next = i + 1 < lines.length ? lines[i + 1]!.trim() : "";
    if (next !== "" && TIMING_LINE_RE.test(next)) {
      i = collectFrom(i + 1);
      continue;
    }
    i += 1; // garbage / orphan text — skip one line, keep scanning
  }
  return cues;
}

/** Cleans + pushes one cue; returns true (lets callers chain in `return … && next`). */
function pushCue(cues: TranscriptCue[], start: number, end: number, payload: string[]): true {
  const text = cleanCuePayload(payload.join("\n"));
  if (text) {
    cues.push({ id: `cue-${cues.length}-${start}`, start, end, text });
  }
  return true;
}

// ── Arabic-normalized transcript search (P1-23) ────────────────────
// فيزياء / فيزياءً / الفيزياء should all meet: diacritics, tatweel and
// the classic Alef/Ya/Ta variants collapse before matching.

/** Alef forms → ا, Ya/Alef-maqsura → ي, Ta-marbuta → ه, Hamza seats unfolded. */
function normalizeArabicChar(ch: string): string {
  switch (ch) {
    case "أ":
    case "إ":
    case "آ":
      return "ا";
    case "ة":
      return "ه";
    case "ى":
    case "ئ":
      return "ي";
    case "ؤ":
      return "و";
    default:
      return ch;
  }
}

const ARABIC_DIACRITICS_RE = /[\u064B-\u065F\u0670\u0640]/g;

export function normalizeArabicSearchText(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS_RE, "")
    .split("")
    .map(normalizeArabicChar)
    .join("")
    .toLowerCase();
}

/**
 * Normalized text + index map back to the ORIGINAL string, so match ranges
 * can highlight the user's real text (diacritics shift indices, hence the map).
 */
const ARABIC_IGNORED_CHAR_RE = /[ً-ٰٟـ]/;

function normalizeWithIndexMap(input: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  for (let idx = 0; idx < input.length; idx += 1) {
    const ch = input[idx]!;
    // Combining marks / tatweel vanish: they occupy original indices but
    // produce no normalized output, so later indices stay exact.
    if (ARABIC_IGNORED_CHAR_RE.test(ch)) continue;
    const norm = normalizeArabicChar(ch).toLowerCase();
    for (const outCh of norm) {
      out.push(outCh);
      map.push(idx);
    }
  }
  return { text: out.join(""), map };
}

export interface TranscriptTextMatch {
  start: number;
  end: number;
}

/**
 * Best match range of `query` inside `text` (original-string indices).
 * Phrase match wins; otherwise every query token must appear (AND) and the
 * first token's span is highlighted. Null when not all tokens match.
 */
export function findTranscriptMatchRange(
  text: string,
  query: string
): TranscriptTextMatch | null {
  const needle = normalizeArabicSearchText(query.trim());
  if (!needle) return null;
  const { text: haystack, map } = normalizeWithIndexMap(text);
  const toOriginal = (normStart: number, normEnd: number): TranscriptTextMatch => ({
    start: map[normStart] ?? 0,
    end: (map[normEnd - 1] ?? text.length - 1) + 1,
  });

  const phraseAt = haystack.indexOf(needle);
  if (phraseAt >= 0) return toOriginal(phraseAt, phraseAt + needle.length);

  const tokens = needle.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const firstAt = haystack.indexOf(tokens[0]!);
  if (firstAt < 0) return null;
  let cursor = firstAt;
  for (const token of tokens) {
    const at = haystack.indexOf(token, cursor);
    if (at < 0) return null;
    cursor = at + token.length;
  }
  return toOriginal(firstAt, firstAt + tokens[0]!.length);
}

/**
 * Ranked transcript search: phrase hits first, then all-tokens hits
 * (earlier position wins), ties broken by cue time. Returns the cues in
 * ranked order (jump-to-match = first result).
 */
export function searchTranscriptCues(cues: TranscriptCue[], query: string): TranscriptCue[] {
  const needle = normalizeArabicSearchText(query.trim());
  if (!needle) return cues;
  const scored: Array<{ cue: TranscriptCue; score: number }> = [];
  for (const cue of cues) {
    const { text: haystack } = normalizeWithIndexMap(cue.text);
    const phraseAt = haystack.indexOf(needle);
    if (phraseAt >= 0) {
      scored.push({ cue, score: 1000 - Math.min(phraseAt, 500) });
      continue;
    }
    const tokens = needle.split(/\s+/).filter(Boolean);
    let cursor = 0;
    let ok = true;
    for (const token of tokens) {
      const at = haystack.indexOf(token, cursor);
      if (at < 0) {
        ok = false;
        break;
      }
      cursor = at + token.length;
    }
    if (ok) scored.push({ cue, score: 100 });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.cue.start - b.cue.start)
    .map((s) => s.cue);
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
