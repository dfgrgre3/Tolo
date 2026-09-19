/**
 * Central player error engine (P2-36).
 *
 * Every provider failure normalizes through ONE path:
 *
 *   provider error → normalize → { code, severity, retryable } →
 *   user message + telemetry
 *
 * Shape:
 *   { code, retryable, provider, technicalCause }
 */
import type { PlayerError, PlayerErrorCode, VideoProvider } from "./types";

export type PlayerErrorSeverity = "fatal" | "recoverable" | "transient";

const ERROR_SEVERITY: Record<PlayerErrorCode, PlayerErrorSeverity> = {
  NETWORK: "transient",
  MEDIA: "recoverable",
  SOURCE: "fatal",
  AUTH: "fatal",
  GEO_BLOCKED: "fatal",
  EMBED_BLOCKED: "fatal",
  DRM: "fatal",
  AUTOPLAY: "recoverable",
  UNSUPPORTED: "fatal",
  UNKNOWN: "recoverable",
};

export interface RichPlayerError extends PlayerError {
  severity: PlayerErrorSeverity;
  /** Tag for logs/telemetry, e.g. "hls:FRAG_LOAD_ERROR". Never user-facing. */
  technicalCause?: string;
}

export function createPlayerError(
  code: PlayerErrorCode,
  provider: VideoProvider,
  opts: { nativeCode?: string | number; retryable?: boolean; technicalCause?: string } = {}
): RichPlayerError {
  const retryable = opts.retryable ?? ERROR_SEVERITY[code] !== "fatal";
  return {
    code,
    provider,
    nativeCode: opts.nativeCode,
    retryable,
    severity: ERROR_SEVERITY[code],
    technicalCause: opts.technicalCause,
  };
}

export function playerErrorSeverity(error: Pick<PlayerError, "code">): PlayerErrorSeverity {
  return ERROR_SEVERITY[error.code];
}

/**
 * Maps an hls.js fatal error into the taxonomy. Network-layer failures stay
 * retryable/transient; manifest/level failures mean the SOURCE is bad;
 * key-system failures are DRM. Anything unrecognized is recoverable UNKNOWN
 * (retry policy decides the budget, not the mapping).
 */
export function mapHlsError(
  type: string,
  details: string | undefined,
  provider: VideoProvider
): RichPlayerError {
  const cause = `hls:${details ?? type}`;
  if (type === "networkError") {
    if (
      details === "manifestLoadError" ||
      details === "levelLoadError" ||
      details === "audioTrackLoadError" ||
      details === "subtitleTrackLoadError"
    ) {
      return createPlayerError("SOURCE", provider, { technicalCause: cause });
    }
    return createPlayerError("NETWORK", provider, { technicalCause: cause });
  }
  if (type === "mediaError") {
    if (details === "keySystemError" || (details ?? "").includes("keySystem")) {
      return createPlayerError("DRM", provider, { technicalCause: cause });
    }
    return createPlayerError("MEDIA", provider, { technicalCause: cause });
  }
  return createPlayerError("UNKNOWN", provider, { technicalCause: cause });
}

export type ErrorReporter = (error: RichPlayerError) => void;

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

export function playerErrorMessage(error: Pick<PlayerError, "code">): string {
  return PLAYER_ERROR_MESSAGES[error.code] ?? PLAYER_ERROR_MESSAGES.UNKNOWN;
}

// ── Provider error mapping (P1-9) ──────────────────────────────────
// YouTube IFrame Player API error numbers → unified taxonomy:
//   2   invalid parameter (bad video id)        → SOURCE
//   5   HTML5 player error                      → MEDIA
//   100 not found / private / deleted          → SOURCE
//   101 owner disallows embedding               → EMBED_BLOCKED
//   150 same as 101 (kept for version compat)  → EMBED_BLOCKED
export function mapYouTubeErrorCode(code: number | undefined): RichPlayerError {
  // `undefined` = the IFrame SDK itself failed to load (offline / blocked
  // script) → NETWORK, not UNKNOWN.
  if (code === undefined) {
    return createPlayerError("NETWORK", "youtube", {
      technicalCause: "youtube:sdk-load-failed",
    });
  }
  let errorCode: PlayerErrorCode = "UNKNOWN";
  if (code === 2 || code === 100) errorCode = "SOURCE";
  else if (code === 5) errorCode = "MEDIA";
  else if (code === 101 || code === 150) errorCode = "EMBED_BLOCKED";

  return createPlayerError(errorCode, "youtube", {
    nativeCode: code,
    retryable: errorCode === "MEDIA",
    technicalCause: `youtube:${code}`,
  });
}

/**
 * Builds the reporter CourseVideoPlayer passes everywhere: one user message
 * (localized, non-technical) + one telemetry event. Technical detail goes to
 * telemetry/logs only — never to the screen.
 */
export function createErrorReporter(opts: {
  setErrorMessage: (message: string | null) => void;
  trackError?: (error: RichPlayerError) => void;
}): ErrorReporter {
  return (error) => {
    opts.setErrorMessage(playerErrorMessage(error));
    try {
      opts.trackError?.(error);
    } catch {
      // Reporting must never break playback.
    }
  };
}
