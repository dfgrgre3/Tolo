/**
 * أنواع المشغل - محدثة بالكامل
 * @module video/player/types
 */

// تعريف مزودي الخدمة
export type VideoProvider = "youtube" | "bunny" | "cloudflare" | "html5" | "unknown";

// ── SOURCE OF TRUTH CONTRACT (P1-16) ─────────────────────────────
// State is deliberately spread across runtimes (media element, YouTube
// IFrame, hls.js, browser APIs, backend). To keep UI state from diverging
// from reality, each fact has EXACTLY ONE owner:
//
//   currentTime / duration / buffered  → media engine (element / YT API),
//                                       pushed to the store throttled (~4Hz)
//   playing / buffering / ended        → media engine events (play/pause/
//                                       waiting/playing/ended), never set
//                                       speculatively except via commands
//   volume / muted / playbackRate      → player engine: every change goes
//                                       through the adapter (element + store
//                                       together); persisted prefs reseed it
//   loop range                         → player adapter (engine-owned);
//                                       the store keeps a display mirror only
//   fullscreen / PiP                   → browser APIs; the store mirrors via
//                                       fullscreenchange / PiP events only
//   completion / progress              → backend (authoritative) + local
//                                       offline queue; the player never
//                                       completes a lesson by itself
//   panels / overlays / feedback       → UI store (pure view state)
//   preferences (subtitle, audio,      → settings store + localStorage
//   brightness, quality key, …)
//
// Rule: components REACT to engine state; they never WRITE engine facts
// except through player commands (adapter methods, begin/endTemporaryRate,
// changeQuality/changeAudioTrack/changeSubtitle, seek/toggleLoop …).
// ──────────────────────────────────────────────────────────────────

// ── Unified player error model (P1-9) ──────────────────────────────
// Every provider (HTML5 media element, HLS.js, YouTube IFrame) maps its
// native failure into this taxonomy so the player surface shows ONE error
// contract instead of per-provider ad-hoc strings.
export type PlayerErrorCode =
  | "NETWORK"
  | "MEDIA"
  | "SOURCE"
  | "AUTH"
  | "GEO_BLOCKED"
  | "EMBED_BLOCKED"
  | "DRM"
  | "AUTOPLAY"
  | "UNSUPPORTED"
  | "UNKNOWN";

export interface PlayerError {
  code: PlayerErrorCode;
  provider: VideoProvider;
  /** Native detail (YouTube player error number, DOMException name…). */
  nativeCode?: string | number;
  retryable: boolean;
}

// واجهة برمجة تطبيقات المشغل الخارجية
export interface CourseVideoPlayerApi {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  setPlaybackRate: (rate: number) => void;
}

// خصائص المشغل الرئيسية
export interface CourseVideoPlayerProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  /**
   * Explicit provider from the backend (P1-10). Always wins over URL
   * detection — required for custom CDNs, signed URLs and aliases.
   */
  provider?: VideoProvider;
  alreadyCompleted?: boolean;
  onLessonAutoComplete?: (lessonId: string) => void;
  onNextVideo?: (nextLessonId?: string) => void;
  playerApiRef?: React.MutableRefObject<CourseVideoPlayerApi | null>;
  className?: string;
  watermarkText?: string;
  bookmarks?: BookmarkItem[];
  chapterMarkers?: BookmarkItem[];
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  audioTracks?: AudioTrack[];
  subtitleTracks?: SubtitleTrack[];
  lessons?: LessonInfo[];
  onLessonChange?: (lessonId: string) => void;
  thumbnailVttUrl?: string;
  qualitySources?: QualitySource[];
  interactiveQuestions?: InteractiveQuestion[];
  /**
   * Escape hatch: skip fetching the stripped server question list and use
   * only embedded props. Default false (server-first, props as fallback).
   */
  disableServerQuestions?: boolean;
  onProgress?: (currentTime: number, duration: number) => void;
}

// تعليقات تفاعلية (null عند عدم وجود تعليق)
export interface PlayerFeedback {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
}

export type PlayerFeedbackType = PlayerFeedback | null;

// تفضيلات المشغل المخزنة
export interface PlayerPreferences {
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isAmbientMode: boolean;
  selectedSubtitle: string;
  selectedAudioTrack: string;
  brightness: number;
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
}

// خيارات الجودة
//
// P1-11: `key` is the stable UI/business identity (e.g. "1080p"), independent
// of manifest ordering. `levelIndex` is the transient HLS engine handle —
// never persisted, never compared across manifests, never used as identity.
export interface QualityOption {
  key: string;
  label: string;
  height?: number;
  /** Average bitrate in bits/sec (from the HLS level, when known). */
  bitrate?: number;
  levelIndex: number;
}

// مصدر الجودة
export interface QualitySource {
  id: number;
  label: string;
  src: string;
}

// مشغل يوتيوب وقت التشغيل
export interface YouTubeRuntimePlayer {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  mute: () => void;
  unMute: () => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  destroy: () => void;
  getAvailablePlaybackRates?: () => number[];
}

// تعريف YouTube Namespace للـ API
export interface YouTubeNamespace {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Record<string, unknown>;
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: (event: { data: number }) => void;
      };
    }
  ) => YouTubeRuntimePlayer;
  PlayerState: {
    PLAYING: number;
    PAUSED: number;
    ENDED: number;
    UNSTARTED: number;
    BUFFERING: number;
    CUED: number;
  };
}

// عنصر العلامة المائية (Bookmark/وقت محدد)
export interface BookmarkItem {
  id?: string;
  time: number;
  endTime?: number;
  label: string;
}

// Thumbnail Cue للـ thumbnails على شريط التقدم
export interface ThumbnailCue {
  start: number;
  end: number;
  imageUrl: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

// ملاحظة على الخط الزمني
export interface TimelineNote {
  id: string;
  time: number;
  text: string;
  createdAt?: number;
}

// سؤال تفاعلي
//
// P0 SERVER-TRUST RULE:
// - `correctOptionIndex` present  → FORMATIVE ("check your understanding").
//   Graded locally, informational only. MUST NOT gate grades, completion,
//   certificates, or course progression — any DevTools user can read it.
// - `correctOptionIndex` absent   → SERVER-VALIDATED. The client renders the
//   question but NEVER decides correctness; the verdict comes from
//   POST …/questions/:id/answer (see lib/lesson-questions.ts). Use this mode
//   for anything tied to evaluation, completion requirements, or gating.
export type InteractiveQuestionValidation =
  | "formative"   // local check, informational only
  | "server";     // backend verdict is authoritative

export interface InteractiveQuestion {
  id: string;
  lessonId?: string;
  timePosition?: number;
  time?: number;
  question: string;
  options: string[];
  /** Present only for formative questions. Never sent for server-validated ones. */
  correctOptionIndex?: number;
  explanation?: string;
  /** Explicit mode. Defaults: "server" when correctOptionIndex is absent, else "formative". */
  validation?: InteractiveQuestionValidation;
}

/** Resolved validation mode for a question (never trust client default for graded use). */
export function resolveQuestionValidation(q: InteractiveQuestion): InteractiveQuestionValidation {
  if (q.validation) return q.validation;
  return q.correctOptionIndex === undefined ? "server" : "formative";
}

/** Attempt submitted for server validation. attemptId doubles as the idempotency key. */
export interface QuestionAttemptRequest {
  lessonId: string;
  questionId: string;
  selectedOptionIndex: number;
  /** Client-generated UUID, stable per presented question → safe retry, no double counting. */
  attemptId: string;
  /** Epoch ms when the student submitted. */
  answeredAt: number;
}

/** Authoritative verdict — only the backend may produce this for server-mode questions. */
export interface QuestionAttemptVerdict {
  correct: boolean;
  /** Server may reveal the correct option AFTER grading (for review display). */
  correctOptionIndex?: number;
  explanation?: string;
  score?: number;
}

// تبويب اللوحة الجانبية
//
// P1-20: exactly the tabs the player sidebar implements. Q&A / resources /
// AI live at the lesson-page level (LessonTabsSection), not in this unit —
// keeping their names here created dead paths and unreachable branches.
export type SidebarTab = "notes" | "bookmarks" | "lessons" | "transcript";

// سطر واحد من نص الفيديو (transcript) — مستخرج من ملف SRT/VTT
export interface TranscriptCue {
  id: string;
  start: number;
  end: number;
  text: string;
}

// مسار ترجمة
export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
}

// مسار صوت
export interface AudioTrack {
  id: string;
  label: string;
  language: string;
}

// معلومات الدرس
export interface LessonInfo {
  id: string;
  title: string;
  duration?: number;
  completed?: boolean;
}

// تقدم الفيديو المخزن
export interface StoredVideoProgress {
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: number;
  completed: boolean;
}