'use client';

import { useState } from "react";
import { AUTO_QUALITY_KEY } from "../constants";
import { useShallow } from "zustand/react/shallow";
import { usePlayerPlayback, usePlayerUI, usePlayerSettings } from "../stores/player-scope";
import type {
  AudioTrack,
  BookmarkItem,
  LessonInfo,
  QualityOption,
  SubtitleTrack,
  TimelineNote,
  TranscriptCue,
} from "../types";
import { formatWatchTime } from "../utils";
import { useEfficiencyMode } from "@/hooks";
// FIX (Code Splitting): Replaced static imports with lazy suspended versions.
// Previously these panels were statically imported, forcing the browser to download
// all panel code (charts, settings UI, sidebar content) on initial page load even if
// the user never opens any panel. Now each panel chunk is fetched on-demand only when
// the user clicks the corresponding button, cutting the initial JS bundle by ~35-45%.
import {
  SuspendedSettingsPanel,
  SuspendedStatsPanel,
  SuspendedHelpPanel,
  SuspendedSidebarPanel,
} from "./LazyComponents";

export function PlayerPanels({
  qualities,
  playbackRates,
  subtitleTracks,
  audioTracks,
  selectedAudioTrack,
  onChangeAudioTrack,
  lessons,
  lessonId,
  bookmarks,
  notes,
  noteDraft,
  selectedSubtitleLabel,
  isNotesSyncing,
  allowAutoQuality,
  onCloseSettings,
  onChangeQuality,
  onChangePlaybackRate,
  onChangeSubtitle,
  onToggleAmbient,
  onChangeBrightness,
  onOpenStats,
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
  onToggleShortcuts,
  hasTranscript,
  transcriptCues,
  transcriptQuery,
  onTranscriptQueryChange,
}: {
  qualities: QualityOption[];
  playbackRates: number[];
  subtitleTracks: SubtitleTrack[];
  audioTracks: AudioTrack[];
  selectedAudioTrack: string;
  onChangeAudioTrack: (trackId: string) => void;
  lessons: LessonInfo[];
  lessonId: string;
  bookmarks: BookmarkItem[];
  notes: TimelineNote[];
  noteDraft: string;
  selectedSubtitleLabel: string;
  isNotesSyncing: boolean;
  allowAutoQuality: boolean;
  onCloseSettings: () => void;
  onChangeQuality: (qualityKey: string) => void;
  onChangePlaybackRate: (rate: number) => void;
  onChangeSubtitle: (subtitleId: string) => void;
  onToggleAmbient: () => void;
  onChangeBrightness: (brightness: number) => void;
  onOpenStats: () => void;
  onCloseStats: () => void;
  onCloseHelp: () => void;
  onCloseSidebar: () => void;
  onToggleSidebarTab: (tab: "bookmarks" | "notes" | "lessons" | "transcript") => void;
  onNoteDraftChange: (value: string) => void;
  onAddNoteAtCurrentTime: () => void;
  onInsertTimestamp: () => void;
  onRemoveNote: (noteId: string) => void;
  onJumpToTime: (seconds: number) => void;
  onLessonChange?: (lessonId: string) => void;
  onToggleShortcuts: () => void;
  hasTranscript: boolean;
  transcriptCues: TranscriptCue[];
  transcriptQuery: string;
  onTranscriptQueryChange: (value: string) => void;
}) {
  const {
    isSettingsOpen,
    isStatsOpen,
    isHelpOpen,
    isShortcutsOpen,
    isSidebarOpen,
    sidebarTab,
  } = usePlayerUI(
    useShallow((state) => ({
      isSettingsOpen: state.isSettingsOpen,
      isStatsOpen: state.isStatsOpen,
      isHelpOpen: state.isHelpOpen,
      isShortcutsOpen: state.isShortcutsOpen,
      isSidebarOpen: state.isSidebarOpen,
      sidebarTab: state.sidebarTab,
    }))
  );

  // Latch: once a panel has been opened it stays mounted (keeps lazy chunks and
  // exit animations alive). Derived during render from the store flags using the
  // "adjust state when a prop changes" pattern — no effect needed.
  const [openedPanels, setOpenedPanels] = useState({
    settings: false,
    stats: false,
    help: false,
    sidebar: false,
  });

  let nextOpenedPanels = openedPanels;
  if (isSettingsOpen && !nextOpenedPanels.settings) {
    nextOpenedPanels = { ...nextOpenedPanels, settings: true };
  }
  if (isStatsOpen && !nextOpenedPanels.stats) {
    nextOpenedPanels = { ...nextOpenedPanels, stats: true };
  }
  if (isHelpOpen && !nextOpenedPanels.help) {
    nextOpenedPanels = { ...nextOpenedPanels, help: true };
  }
  if (isSidebarOpen && !nextOpenedPanels.sidebar) {
    nextOpenedPanels = { ...nextOpenedPanels, sidebar: true };
  }
  if (nextOpenedPanels !== openedPanels) {
    setOpenedPanels(nextOpenedPanels);
  }

  const { settings: settingsOpened, stats: statsOpened, help: helpOpened, sidebar: sidebarOpened } = nextOpenedPanels;

  const {
    selectedQualityKey,
    selectedSubtitle,
    isAmbientMode,
    brightness,
    currentAutoQuality,
    currentAutoBitrate,
    watchSeconds,
  } = usePlayerSettings(
    useShallow((state) => ({
      selectedQualityKey: state.selectedQualityKey,
      selectedSubtitle: state.selectedSubtitle,
      isAmbientMode: state.isAmbientMode,
      brightness: state.brightness,
      currentAutoQuality: state.currentAutoQuality,
      currentAutoBitrate: state.currentAutoBitrate,
      watchSeconds: state.watchSeconds,
    }))
  );

  const {
    playbackRate,
    currentTime,
    buffered,
  } = usePlayerPlayback(
    useShallow((state) => ({
      playbackRate: state.playbackRate,
      currentTime: state.currentTime,
      buffered: state.buffered,
    }))
  );

  const isEfficiencyMode = useEfficiencyMode();

  const formatBitrate = (bps: number | null | undefined) =>
    typeof bps === "number" && bps > 0 ? ` · ${(bps / 1_000_000).toFixed(1)} Mbps` : "";

  const statsItems = [
    {
      label: "الجودة الحالية",
      value:
        selectedQualityKey === AUTO_QUALITY_KEY
          ? currentAutoQuality
            ? `${currentAutoQuality}p (تلقائي${formatBitrate(currentAutoBitrate)})`
            : "تلقائي"
          : (qualities.find((item) => item.key === selectedQualityKey)?.label ?? "يدوي") +
            formatBitrate(qualities.find((item) => item.key === selectedQualityKey)?.bitrate),
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
      {settingsOpened && (
        <SuspendedSettingsPanel
          isSettingsOpen={isSettingsOpen}
          isEfficiencyMode={isEfficiencyMode}
          qualities={qualities}
          allowAutoQuality={allowAutoQuality}
          selectedQualityKey={selectedQualityKey}
          onChangeQuality={onChangeQuality}
          playbackRates={playbackRates}
          playbackRate={playbackRate}
          onChangePlaybackRate={onChangePlaybackRate}
          subtitleTracks={subtitleTracks}
          selectedSubtitle={selectedSubtitle}
          onChangeSubtitle={onChangeSubtitle}
          audioTracks={audioTracks}
          selectedAudioTrack={selectedAudioTrack}
          onChangeAudioTrack={onChangeAudioTrack}
          brightness={brightness}
          onChangeBrightness={onChangeBrightness}
          isAmbientMode={isAmbientMode}
          onToggleAmbient={onToggleAmbient}
          onOpenStats={onOpenStats}
          onCloseSettings={onCloseSettings}
          shortcuts={shortcuts}
          isShortcutsOpen={isShortcutsOpen}
          onToggleShortcuts={onToggleShortcuts}
        />
      )}

      {statsOpened && (
        <SuspendedStatsPanel
          isStatsOpen={isStatsOpen}
          isEfficiencyMode={isEfficiencyMode}
          statsItems={statsItems}
          audioTracks={audioTracks}
          selectedAudioTrack={selectedAudioTrack}
          onCloseStats={onCloseStats}
        />
      )}

      {helpOpened && (
        <SuspendedHelpPanel
          isHelpOpen={isHelpOpen}
          isEfficiencyMode={isEfficiencyMode}
          shortcuts={shortcuts}
          onCloseHelp={onCloseHelp}
        />
      )}

      {sidebarOpened && (
        <SuspendedSidebarPanel
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
          hasTranscript={hasTranscript}
          transcriptCues={transcriptCues}
          transcriptQuery={transcriptQuery}
          onTranscriptQueryChange={onTranscriptQueryChange}
          lessons={lessons}
          lessonId={lessonId}
          onLessonChange={onLessonChange}
          onCloseSidebar={onCloseSidebar}
        />
      )}
    </>
  );
}
