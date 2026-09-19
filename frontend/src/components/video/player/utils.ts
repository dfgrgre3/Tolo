import {
  DEFAULT_PLAYER_PREFERENCES,
  AUTO_COMPLETE_PERCENT,
  LEGACY_PREFERENCES_KEY,
  NOTES_TIMELINE_END,
  NOTES_TIMELINE_START,
  PLAYER_PREFERENCES_KEY,
  PREFERENCES_SCHEMA_VERSION,
} from "./constants";
import type {
  BookmarkItem,
  PlayerPreferences,
  ThumbnailCue,
  TimelineNote,
  TranscriptCue,
  VideoProvider,
} from "./types";

// ── Provider error mapping moved to errors.ts (P1-9, centralized P2-36) ──
// (mapYouTubeErrorCode / playerErrorMessage live there; re-exported below.)

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
 * Explicit source metadata (P1-10, enriched P2-34). URL sniffing is a
 * fallback only: when the backend knows the source, it should send the
 * provider directly (custom CDNs, signed URLs, aliases and redirects all
 * defeat guessing).
 *
 * The security-relevant fields (token, expiresAt, drm, allowedFeatures)
 * travel with the source so playback decisions (fallback switching,
 * feature gating) read ONE object instead of re-sniffing strings.
 */
export interface VideoSource {
  url: string;
  /** Explicit provider from the backend — always wins over detection. */
  provider?: VideoProvider;
  /** MIME / container hint, e.g. "application/x-mpegURL". */
  contentType?: string;
  /** Canonical playable URL (signed manifest). Defaults to `url`. */
  manifestUrl?: string;
  /** Ordered failover manifests, tried after the primary is exhausted. */
  fallbackUrls?: string[];
  /** Short-lived access token, when the URL itself is unsigned. */
  token?: string;
  /** Epoch ms when access expires — refresh BEFORE this, not after a 403. */
  expiresAt?: number;
  /** DRM descriptor (informational; enforcement is server-side). */
  drm?: { type: "widevine" | "fairplay" | "playready" | "none" };
  /** Feature gates from the backend (capture/cast/download…). */
  allowedFeatures?: Partial<Record<"capture" | "cast" | "download" | "airplay", boolean>>;
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
  fallbackUrls: string[];
} {
  if (typeof source === "string") {
    return { url: source, provider: detectProviderFromUrl(source), fallbackUrls: [] };
  }
  const url = source.manifestUrl ?? source.url;
  return {
    url,
    provider: source.provider ?? detectProviderFromUrl(url),
    fallbackUrls: (source.fallbackUrls ?? []).filter((u) => u && u !== url),
  };
}

function hasHlsPath(videoUrl: string) {
  try {
    return new URL(videoUrl, "http://local.invalid").pathname.toLowerCase().endsWith(".m3u8");
  } catch {
    return false;
  }
}

/** Public: is this URL an HLS manifest (path-based, query-safe)? */
export function isHlsManifestUrl(videoUrl: string): boolean {
  if (!videoUrl) return false;
  return hasHlsPath(videoUrl);
}

// ── Unified error taxonomy lives in errors.ts (P2-36) to keep this module
// cycle-free (errors.ts has zero runtime imports). Re-exported here so
// existing call sites keep working.
export { mapYouTubeErrorCode, playerErrorMessage } from "./errors";

export function shouldUseHls(videoUrl: string, provider: VideoProvider) {
  if (!videoUrl) return false;
  return (
    hasHlsPath(videoUrl) ||
    provider === "bunny" ||
    provider === "cloudflare"
  );
}

// ── Provider error mapping (P1-9) ──────────────────────────────────
// (Moved to errors.ts and centralized under P2-36; kept here as a
// re-export so existing call sites keep working.)

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

/**
 * Explicit preference migrations (P2-44) — NOT merge-with-defaults.
 *
 * Payloads are version-stamped (`_v`) so every upgrade runs as a named,
 * testable step. History: preferences were keyed per version
 * (`…:v4`), so the only surviving legacy shape is the unstamped v4 object
 * (treated as `_v: 4`); anything older/unknown falls back to defaults.
 */
type StoredPreferences = Partial<PlayerPreferences> & { _v?: unknown };

type PreferenceMigration = (prefs: Record<string, unknown>) => Record<string, unknown>;

const PREFERENCE_MIGRATIONS: Record<number, PreferenceMigration> = {
  // v4 → v5: behavior + track preferences introduced in P1-12/P2-43.
  4: (prefs) => ({
    ...prefs,
    _v: PREFERENCES_SCHEMA_VERSION,
    selectedAudioTrack: prefs["selectedAudioTrack"] ?? "auto",
    subtitleSize: prefs["subtitleSize"] ?? "md",
    subtitleBgOpacity: prefs["subtitleBgOpacity"] ?? 0.7,
    selectedQualityKey: prefs["selectedQualityKey"] ?? "auto",
    autoplayNext: prefs["autoplayNext"] ?? true,
    skipIntro: prefs["skipIntro"] ?? false,
    gesturesEnabled: prefs["gesturesEnabled"] ?? true,
    shortcutsEnabled: prefs["shortcutsEnabled"] ?? true,
    miniPlayerMode: prefs["miniPlayerMode"] ?? "auto",
  }),
};

export function migratePreferences(raw: unknown): PlayerPreferences {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return DEFAULT_PLAYER_PREFERENCES;
  }
  const stamped = raw as StoredPreferences;
  let version =
    typeof stamped._v === "number" && Number.isInteger(stamped._v) ? stamped._v : 4;
  let current: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  while (version < PREFERENCES_SCHEMA_VERSION) {
    const migrate = PREFERENCE_MIGRATIONS[version];
    if (!migrate) break;
    current = migrate(current);
    version += 1;
  }
  const { _v: _ignored, ...fields } = current;
  void _ignored;
  return { ...DEFAULT_PLAYER_PREFERENCES, ...(fields as Partial<PlayerPreferences>) };
}

export function readPlayerPreferences(): PlayerPreferences {
  if (typeof window === "undefined") {
    return DEFAULT_PLAYER_PREFERENCES;
  }

  // Current key first, then the legacy v4 key (migrated on read and
  // re-saved under v5 by the writer effect). Unknown/corrupt payloads →
  // defaults, never a crash.
  const readKey = (key: string): unknown => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  };

  return migratePreferences(
    readKey(PLAYER_PREFERENCES_KEY) ?? readKey(LEGACY_PREFERENCES_KEY)
  );
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

// ── Parsers live in parsers/ (P3-55); re-exported here so every existing
// call site (player + lesson pages + tests) keeps working unchanged. ──
export {
  parseCloudTimelineNotes,
  serializeCloudTimelineNotes,
  createTimelineNote,
} from "./parsers/notes";

export {
  parseThumbnailVtt,
  getThumbnailCueAtTime,
} from "./parsers/thumbnails";

export { mergeChapterMarkers } from "./parsers/transcript";
export {
  parseTranscript,
  parseTranscriptTimestamp,
  normalizeArabicSearchText,
  findTranscriptMatchRange,
  searchTranscriptCues,
} from "./parsers/transcript";
export type { TranscriptTextMatch } from "./parsers/transcript";

// ── Pure progress math (P3-52 — unit-testable, no DOM/store) ─────────

/** Snapshot for one position: percent + auto-complete threshold evaluation. */
export function computeProgressSnapshot(
  currentTime: number,
  duration: number,
  autoCompletePercent = AUTO_COMPLETE_PERCENT
): { position: number; percent: number; completed: boolean } {
  if (!Number.isFinite(duration) || duration <= 0) {
    return { position: 0, percent: 0, completed: false };
  }
  const position = clamp(Number.isFinite(currentTime) ? currentTime : 0, 0, duration);
  const percent = (position / duration) * 100;
  return { position, percent, completed: percent >= autoCompletePercent };
}

export interface ResumeCandidates {
  localTime: number | null;
  localUpdatedAtMs: number;
  serverPosition: number | null;
  serverUpdatedAtMs: number;
  duration: number;
  minResumeSeconds: number;
}

/**
 * Resume arbitration (P3-52): server wins on newer-or-equal timestamp,
 * otherwise local. Returns null when the winner sits at the edges
 * (too early to matter / too close to the end to resume into).
 */
export function selectResumePosition(candidates: ResumeCandidates): number | null {
  const {
    localTime,
    localUpdatedAtMs,
    serverPosition,
    serverUpdatedAtMs,
    duration,
    minResumeSeconds,
  } = candidates;
  if (!Number.isFinite(duration) || duration <= 0) return null;
  let winner = localTime;
  if (
    serverPosition !== null &&
    serverPosition > 0 &&
    serverUpdatedAtMs >= localUpdatedAtMs
  ) {
    winner = serverPosition;
  }
  if (
    winner === null ||
    !Number.isFinite(winner) ||
    winner <= minResumeSeconds ||
    winner >= duration - minResumeSeconds
  ) {
    return null;
  }
  return winner;
}
