/**
 * أنواع المشغل - محدثة بالكامل
 * @module video/player/types
 */

// تعريف مزودي الخدمة
export type VideoProvider = "youtube" | "bunny" | "cloudflare" | "html5" | "unknown";

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
  brightness: number;
  isSidebarOpen: boolean;
  sidebarTab: SidebarTab;
}

// خيارات الجودة
export interface QualityOption {
  id: number;
  label: string;
  height?: number;
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
        onError?: () => void;
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
export interface InteractiveQuestion {
  id: string;
  lessonId?: string;
  timePosition?: number;
  time?: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
}

// تبويب اللوحة الجانبية
export type SidebarTab = "notes" | "qna" | "resources" | "ai" | "bookmarks" | "lessons" | "transcript";

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