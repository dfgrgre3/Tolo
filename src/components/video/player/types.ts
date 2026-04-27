import type { MutableRefObject } from "react";
import type { LucideIcon } from "lucide-react";

export type YouTubeRuntimePlayer = {
  destroy: () => void;
  getAvailablePlaybackRates: () => number[];
  getCurrentTime: () => number;
  getDuration: () => number;
  mute: () => void;
  pauseVideo: () => void;
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setPlaybackRate: (playbackRate: number) => void;
  setVolume: (volume: number) => void;
  unMute: () => void;
};

export type YouTubeNamespace = {
  Player: new (
    element: HTMLElement,
    config: {
      videoId: string;
      playerVars: Record<string, any>;
      events: {
        onReady?: () => void;
        onStateChange?: (event: { data: number }) => void;
        onError?: () => void;
      };
    }
  ) => YouTubeRuntimePlayer;
  PlayerState: {
    ENDED: 0;
    PLAYING: 1;
    PAUSED: 2;
    BUFFERING: 3;
    CUED: 5;
  };
};

export type VideoProvider =
  | "youtube"
  | "bunny"
  | "cloudflare"
  | "html5"
  | "unknown";

export type StoredVideoProgress = {
  currentTime: number;
  duration: number;
  percent: number;
  updatedAt: number;
  completed: boolean;
};

export type ServerLessonProgress = {
  completed?: boolean;
  lastVideoPosition?: number;
  updatedAt?: string;
};

export type PlayerPreferences = {
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  isAmbientMode: boolean;
  selectedSubtitle: string;
  brightness: number;
  isSidebarOpen?: boolean;
  sidebarTab?: SidebarTab;
};

export type SidebarTab = "bookmarks" | "notes" | "lessons";

export type QualityOption = {
  id: number;
  height: number;
  label: string;
};

export interface QualitySource {
  id: number;
  label: string;
  src: string;
  height?: number;
}

export type PlayerFeedback =
  | {
      icon: LucideIcon;
      label: string;
    }
  | null;

export interface CourseVideoPlayerApi {
  getCurrentTime: () => number;
  seekTo: (time: number) => void;
  play: () => void;
  pause: () => void;
}

export interface BookmarkItem {
  time: number;
  label: string;
  endTime?: number;
}

export interface TimelineNote {
  id: string;
  time: number;
  text: string;
  createdAt: number;
}

export interface AudioTrack {
  id: string;
  label: string;
  language: string;
}

export interface SubtitleTrack {
  id: string;
  label: string;
  language: string;
  src: string;
}

export interface Lesson {
  id: string;
  title: string;
  duration: number;
  completed?: boolean;
}

export interface ThumbnailCue {
  start: number;
  end: number;
  imageUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CourseVideoPlayerProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  videoUrl: string;
  alreadyCompleted?: boolean;
  onLessonAutoComplete?: () => void;
  onNextVideo?: () => void;
  playerApiRef?: MutableRefObject<CourseVideoPlayerApi | null>;
  className?: string;
  watermarkText?: string;
  bookmarks?: BookmarkItem[];
  chapterMarkers?: BookmarkItem[];
  isTheaterMode?: boolean;
  onToggleTheater?: () => void;
  audioTracks?: AudioTrack[];
  subtitleTracks?: SubtitleTrack[];
  lessons?: Lesson[];
  onLessonChange?: (lessonId: string) => void;
  thumbnailVttUrl?: string;
  qualitySources?: QualitySource[];
}
