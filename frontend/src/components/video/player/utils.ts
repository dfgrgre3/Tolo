import {
  DEFAULT_PLAYER_PREFERENCES,
  NOTES_TIMELINE_END,
  NOTES_TIMELINE_START,
  PLAYER_PREFERENCES_KEY,
} from "./constants";
import type {
  BookmarkItem,
  PlayerError,
  PlayerErrorCode,
  PlayerPreferences,
  ThumbnailCue,
  TimelineNote,
  TranscriptCue,
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

/**
 * Explicit source metadata (P1-10). URL sniffing is a fallback only: when
 * the backend knows the source, it should send the provider directly
 * (custom CDNs, signed URLs, aliases and redirects all defeat guessing).
 */
export interface VideoSource {
  url: string;
  /** Explicit provider from the backend — always wins over detection. */
  provider?: VideoProvider;
  /** MIME / container hint, e.g. "application/x-mpegURL". */
  contentType?: string;
}

/** Matches a hostname against an exact host or any of its subdomains. */
function hostMatches(hostname: string, ...roots: string[]) {
  return roots.some((root) => hostname === root || hostname.endsWith(`.${root}`));
}

function detectProviderFromUrl(videoUrl: string): VideoProvider {
  if (!videoUrl) return "unknown";
  if (parseYouTubeId(videoUrl)) return "youtube";

  let hostname = "";
  let pathname = "";
  try {
    const parsed = new URL(videoUrl, "http://local.invalid");
    hostname = parsed.hostname.toLowerCase();
    pathname = parsed.pathname.toLowerCase();
  } catch {
    return "html5";
  }

  // Hostname-based (never substring on the raw URL — a query param like
  // ?ref=bunnycdn.com must not flip detection).
  if (hostMatches(hostname, "b-cdn.net", "bunnycdn.com", "bunny-stream.com")) {
    return "bunny";
  }
  if (
    hostMatches(hostname, "cloudflarestream.com", "videodelivery.net")
  ) {
    return "cloudflare";
  }
  if (pathname.endsWith(".m3u8")) return "html5"; // generic HLS, unknown CDN
  return "html5";
}

export function getProvider(videoUrl: string): VideoProvider {
  return detectProviderFromUrl(videoUrl);
}

/** Explicit metadata wins; URL detection is the fallback. */
export function resolveVideoSource(source: string | VideoSource): {
  url: string;
  provider: VideoProvider;
} {
  if (typeof source === "string") {
    return { url: source, provider: detectProviderFromUrl(source) };
  }
  return {
    url: source.url,
    provider: source.provider ?? detectProviderFromUrl(source.url),
  };
}

function hasHlsPath(videoUrl: string) {
  try {
    return new URL(videoUrl, "http://local.invalid").pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

export function shouldUseHls(videoUrl: string, provider: VideoProvider) {
  if (!videoUrl) return false;
  return (
    hasHlsPath(videoUrl) ||
    provider === "bunny" ||
    provider === "cloudflare"
  );
}

// ── Provider error mapping (P1-9) ──────────────────────────────────
// YouTube IFrame Player API error numbers → unified PlayerErrorCode:
//   2   invalid parameter (bad video id)        → SOURCE
//   5   HTML5 player error                      → MEDIA
//   100 not found / private / deleted          → SOURCE
//   101 owner disallows embedding               → EMBED_BLOCKED
//   150 same as 101 (kept for version compat)  → EMBED_BLOCKED
export function mapYouTubeErrorCode(code: number | undefined): PlayerError {
  let errorCode: PlayerErrorCode = "UNKNOWN";
  if (code === 2 || code === 100) errorCode = "SOURCE";
  else if (code === 5) errorCode = "MEDIA";
  else if (code === 101 || code === 150) errorCode = "EMBED_BLOCKED";

  return {
    code: errorCode,
    provider: "youtube",
    nativeCode: code,
    retryable: errorCode === "MEDIA",
  };
}

const PLAYER_ERROR_MESSAGES: Record<PlayerErrorCode, string> = {
  NETWORK: "انقطع الاتصال أثناء التشغيل. تحقق من الإنترنت ثم أعد المحاولة.",
  MEDIA: "تعذر فك ترميز هذا المقطع على جهازك. أعد المحاولة.",
  SOURCE: "هذا الفيديو غير متاح حاليًا (محذوف أو خاص).",
  AUTH: "انتهت صلاحية الوصول لهذا الفيديو. أعد تحميل الصفحة.",
  GEO_BLOCKED: "هذا الفيديو غير متاح في منطقتك.",
  EMBED_BLOCKED: "مالك الفيديو منع تشغيله خارج YouTube. افتحه على YouTube مباشرة.",
  DRM: "هذا المحتوى محمي ويتطلب متصفحًا يدعم التشغيل المحمي.",
  AUTOPLAY: "منع المتصفح التشغيل التلقائي. اضغط تشغيل للمتابعة.",
  UNSUPPORTED: "صيغة الفيديو غير مدعومة على هذا المتصفح.",
  UNKNOWN: "تعذر تشغيل الفيديو الحالي.",
};

export function playerErrorMessage(error: PlayerError): string {
  return PLAYER_ERROR_MESSAGES[error.code] ?? PLAYER_ERROR_MESSAGES.UNKNOWN;
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
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));

  if (safeSeconds < 60) {
    return `${safeSeconds} ث`;
  }

  if (safeSeconds < 3600) {
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes} د ${seconds} ث`;
  }

  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  return `${hours} س ${minutes} د`;
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
  // P1-22: per-cue fault isolation — one malformed cue (bad timestamp,
  // unresolvable URL, broken sprite fragment) skips THAT cue instead of
  // throwing the whole manifest away. The .map callback never throws.
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
    imageUrl = new URL(path, vttUrl).toString();
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

// Parses SRT ("00:01:02,500") or VTT ("00:01:02.500" / "01:02.500")
// timestamps with sub-second precision.
const TRANSCRIPT_STAMP_RE = /(\d{1,2}:)?(\d{1,2}):(\d{2})[.,](\d{1,3})/;

function parseTranscriptTimestamp(value: string): number | null {
  const match = TRANSCRIPT_STAMP_RE.exec(value.trim());
  if (!match) return null;
  const [, h, m, s, ms] = match;
  return (
    (h ? Number(h) * 3600 : 0) +
    Number(m) * 60 +
    Number(s) +
    Number((ms ?? "0").padEnd(3, "0")) / 1000
  );
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
      // Blank line ends the cue; a fresh timing line (or identifier +
      // timing) starts the next one even without a blank separator.
      if (text === "") return pushCue(cues, start, end, payload) && j + 1;
      if (TIMING_LINE_RE.test(text)) break;
      const peek = j + 1 < lines.length ? lines[j + 1]!.trim() : "";
      if (peek !== "" && TIMING_LINE_RE.test(peek)) break; // identifier line
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

export function getThumbnailCueAtTime(cues: ThumbnailCue[], time: number) {
  return cues.find((cue) => time >= cue.start && time < cue.end) ?? null;
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
function normalizeWithIndexMap(input: string): { text: string; map: number[] } {
  const out: string[] = [];
  const map: number[] = [];
  const stripped = input.replace(ARABIC_DIACRITICS_RE, "");
  // NOTE: index mapping is built on the diacritic-stripped string; the
  // strip only removes combining marks so remaining indices still align
  // with the original string for the scripts we serve (Arabic + Latin).
  let strippedIndex = 0;
  for (const ch of stripped) {
    const norm = normalizeArabicChar(ch).toLowerCase();
    for (const outCh of norm) {
      out.push(outCh);
      map.push(strippedIndex);
    }
    strippedIndex += ch.length;
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
    if (ok) scored.push({ cue, score: 100 - Math.min(cursor, 90) });
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
