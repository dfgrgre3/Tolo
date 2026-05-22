'use client';

import { useShallow } from "zustand/react/shallow";
import { useCourseVideoPlayerStore } from "../store";
import type {
  AudioTrack,
  BookmarkItem,
  Lesson,
  QualityOption,
  SubtitleTrack,
  TimelineNote,
} from "../types";
import { formatWatchTime } from "../utils";
import { useEfficiencyMode } from "@/hooks";
import { SettingsPanel } from "./panels/SettingsPanel";
import { StatsPanel } from "./panels/StatsPanel";
import { HelpPanel } from "./panels/HelpPanel";
import { SidebarPanel } from "./panels/SidebarPanel";

export function PlayerPanels({
  qualities,
  playbackRates,
  subtitleTracks,
  audioTracks,
  lessons,
  lessonId,
  bookmarks,
  notes,
  noteDraft,
  selectedSubtitleLabel,
  canCopyLink,
  isNotesSyncing,
  allowAutoQuality,
  onCloseSettings,
  onChangeQuality,
  onChangePlaybackRate,
  onChangeSubtitle,
  onToggleAmbient,
  onChangeBrightness,
  onRestartPlayback,
  onOpenStats,
  onCopyLessonLink,
  onCloseStats,
  onCloseHelp,
  onCloseSidebar,
  onToggleSidebarTab,
  onNoteDraftChange,
  onAddNoteAtCurrentTime,
  onInsertTimestamp,
  onRemoveNote,
  onJumpToTime,
  onLessonChange,
}: {
  qualities: QualityOption[];
  playbackRates: number[];
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
  lessons: Lesson[];
  lessonId: string;
  bookmarks: BookmarkItem[];
  notes: TimelineNote[];
  noteDraft: string;
  selectedSubtitleLabel: string;
  canCopyLink: boolean;
  isNotesSyncing: boolean;
  allowAutoQuality: boolean;
  onCloseSettings: () => void;
  onChangeQuality: (qualityId: number) => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeSubtitle: (subtitleId: string) => void;
  onToggleAmbient: () => void;
  onChangeBrightness: (brightness: number) => void;
  onRestartPlayback: () => void;
  onOpenStats: () => void;
  onCopyLessonLink: () => void;
  onCloseStats: () => void;
  onCloseHelp: () => void;
  onCloseSidebar: () => void;
  onToggleSidebarTab: (tab: "bookmarks" | "notes" | "lessons") => void;
  onNoteDraftChange: (value: string) => void;
  onAddNoteAtCurrentTime: () => void;
  onInsertTimestamp: () => void;
  onRemoveNote: (noteId: string) => void;
  onJumpToTime: (seconds: number) => void;
  onLessonChange?: (lessonId: string) => void;
}) {
  const {
    isSettingsOpen,
    isStatsOpen,
    isHelpOpen,
    isSidebarOpen,
    sidebarTab,
    selectedQuality,
    currentAutoQuality,
    playbackRate,
    selectedSubtitle,
    isAmbientMode,
    brightness,
    currentTime,
    buffered,
    watchSeconds,
  } = useCourseVideoPlayerStore(
    useShallow((state) => ({
      isSettingsOpen: state.isSettingsOpen,
      isStatsOpen: state.isStatsOpen,
      isHelpOpen: state.isHelpOpen,
      isSidebarOpen: state.isSidebarOpen,
      sidebarTab: state.sidebarTab,
      selectedQuality: state.selectedQuality,
      currentAutoQuality: state.currentAutoQuality,
      playbackRate: state.playbackRate,
      selectedSubtitle: state.selectedSubtitle,
      isAmbientMode: state.isAmbientMode,
      brightness: state.brightness,
      currentTime: state.currentTime,
      buffered: state.buffered,
      watchSeconds: state.watchSeconds,
    }))
  );

  const isEfficiencyMode = useEfficiencyMode();

  const statsItems = [
    {
      label: "الجودة الحالية",
      value:
        selectedQuality === -1
          ? currentAutoQuality
            ? `${currentAutoQuality}p (تلقائي)`
            : "تلقائي"
          : qualities.find((item) => item.id === selectedQuality)?.label ?? "يدوي",
    },
    { label: "زمن المشاهدة", value: formatWatchTime(watchSeconds) },
    { label: "الترجمة", value: selectedSubtitleLabel },
    { label: "السرعة", value: `${playbackRate}x` },
    {
      label: "المخزن المؤقت",
      value: `${Math.max(0, Math.round(buffered - currentTime))} ث`,
    },
    { label: "السطوع", value: `${Math.round(brightness * 100)}%` },
  ];

  const shortcuts: [string, string][] = [
    ["Space / K", "تشغيل أو إيقاف مؤقت"],
    ["J / ←", "رجوع 10 ثوان"],
    ["L / →", "تقديم 10 ثوان"],
    ["Shift + ← / →", "رجوع أو تقديم 5 ثوان"],
    ["↑ / ↓", "رفع أو خفض الصوت"],
    ["عجلة الماوس", "التحكم في مستوى الصوت"],
    ["< / >", "تقليل أو زيادة سرعة التشغيل"],
    ["0 - 9", "الانتقال إلى نسبة من الفيديو"],
    ["Home / End", "البداية أو النهاية"],
    ["M", "كتم أو إلغاء الكتم"],
    ["F", "ملء الشاشة"],
    ["P", "النافذة العائمة"],
    ["T", "الوضع المسرحي"],
    ["C", "تشغيل أو إيقاف الترجمة"],
    ["A", "تفعيل تكرار مقطع (A-B)"],
    ["N", "فتح لوحة الملاحظات"],
    ["B", "فتح لوحة المعالم"],
    ["Esc", "إغلاق النوافذ المفتوحة"],
    ["?", "إظهار هذه المساعدة"],
  ];

  return (
    <>
      <SettingsPanel
        isSettingsOpen={isSettingsOpen}
        isEfficiencyMode={isEfficiencyMode}
        qualities={qualities}
        allowAutoQuality={allowAutoQuality}
        selectedQuality={selectedQuality}
        onChangeQuality={onChangeQuality}
        playbackRates={playbackRates}
        playbackRate={playbackRate}
        onChangePlaybackRate={onChangePlaybackRate}
        subtitleTracks={subtitleTracks}
        selectedSubtitle={selectedSubtitle}
        onChangeSubtitle={onChangeSubtitle}
        brightness={brightness}
        onChangeBrightness={onChangeBrightness}
        isAmbientMode={isAmbientMode}
        onToggleAmbient={onToggleAmbient}
        onRestartPlayback={onRestartPlayback}
        onOpenStats={onOpenStats}
        canCopyLink={canCopyLink}
        onCopyLessonLink={onCopyLessonLink}
        onCloseSettings={onCloseSettings}
      />

      <StatsPanel
        isStatsOpen={isStatsOpen}
        isEfficiencyMode={isEfficiencyMode}
        statsItems={statsItems}
        audioTracks={audioTracks}
        onCloseStats={onCloseStats}
      />

      <HelpPanel
        isHelpOpen={isHelpOpen}
        isEfficiencyMode={isEfficiencyMode}
        shortcuts={shortcuts}
        onCloseHelp={onCloseHelp}
      />

      <SidebarPanel
        isSidebarOpen={isSidebarOpen}
        isEfficiencyMode={isEfficiencyMode}
        sidebarTab={sidebarTab}
        onToggleSidebarTab={onToggleSidebarTab}
        bookmarks={bookmarks}
        onJumpToTime={onJumpToTime}
        noteDraft={noteDraft}
        onNoteDraftChange={onNoteDraftChange}
        isNotesSyncing={isNotesSyncing}
        onAddNoteAtCurrentTime={onAddNoteAtCurrentTime}
        onInsertTimestamp={onInsertTimestamp}
        currentTime={currentTime}
        notes={notes}
        onRemoveNote={onRemoveNote}
        lessons={lessons}
        lessonId={lessonId}
        onLessonChange={onLessonChange}
        onCloseSidebar={onCloseSidebar}
      />
    </>
  );
}
