import { AnimatePresence, m } from "framer-motion";
import { useShallow } from "zustand/react/shallow";
import {
  Bookmark,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Keyboard,
  Layers,
  ListVideo,
  MessageSquare,
  RotateCcw,
  Sparkles,
  SunMedium,
  type LucideIcon,
} from "lucide-react";
import { useCourseVideoPlayerStore } from "../store";
import type {
  AudioTrack,
  BookmarkItem,
  Lesson,
  QualityOption,
  SubtitleTrack,
  TimelineNote,
} from "../types";
import { formatDuration, formatWatchTime } from "../utils";
import { SidebarTabButton } from "./SidebarTabButton";
import { cn } from "@/lib/utils";
import { useEfficiencyMode } from "@/hooks";

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
    ["↑ / ↓", "رفع أو خفض الصوت"],
    ["0 - 9", "الانتقال إلى نسبة من الفيديو"],
    ["Home / End", "البداية أو النهاية"],
    ["M", "كتم أو إلغاء الكتم"],
    ["F", "ملء الشاشة"],
    ["P", "النافذة العائمة"],
    ["T", "الوضع المسرحي"],
    ["C", "تشغيل أو إيقاف الترجمة"],
    ["N", "فتح لوحة الملاحظات"],
    ["Esc", "إغلاق النوافذ المفتوحة"],
    ["?", "إظهار هذه المساعدة"],
  ];

  return (
    <>
      <AnimatePresence>
        {isSettingsOpen ? (
          <m.div
            initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.97 }}
            transition={isEfficiencyMode ? { duration: 0 } : undefined}
            className={cn(
              "absolute bottom-24 right-4 z-40 w-[320px] rounded-[28px] border border-white/10 bg-slate-950/90 p-4 shadow-2xl",
              !isEfficiencyMode && "backdrop-blur-2xl"
            )}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-white">إعدادات التشغيل</p>
                <p className="text-xs text-white/50">
                  سرعة وجودة وترجمة وأدوات إضافية
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSettings}
                className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="إغلاق الإعدادات"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {qualities.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                  الجودة
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {allowAutoQuality ? (
                    <button
                      type="button"
                      onClick={() => onChangeQuality(-1)}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-xs font-bold transition",
                        selectedQuality === -1
                          ? "bg-blue-500 text-white"
                          : "bg-white/5 text-white/65 hover:bg-white/10"
                      )}
                    >
                      تلقائي
                    </button>
                  ) : null}
                  {qualities.map((quality) => (
                    <button
                      key={quality.id}
                      type="button"
                      onClick={() => onChangeQuality(quality.id)}
                      className={cn(
                        "rounded-2xl px-3 py-2 text-xs font-bold transition",
                        selectedQuality === quality.id
                          ? "bg-blue-500 text-white"
                          : "bg-white/5 text-white/65 hover:bg-white/10"
                      )}
                    >
                      {quality.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                السرعة
              </p>
              <div className="grid grid-cols-3 gap-2">
                {playbackRates.map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onChangePlaybackRate(rate)}
                    className={cn(
                      "rounded-2xl px-3 py-2 text-xs font-bold transition",
                      playbackRate === rate
                        ? "bg-white text-slate-950"
                        : "bg-white/5 text-white/65 hover:bg-white/10"
                    )}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            {subtitleTracks.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                  الترجمة
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => onChangeSubtitle("off")}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold transition",
                      selectedSubtitle === "off"
                        ? "bg-white text-slate-950"
                        : "bg-white/5 text-white/65 hover:bg-white/10"
                    )}
                  >
                    بدون ترجمة
                    {selectedSubtitle === "off" ? <Check className="h-4 w-4" /> : null}
                  </button>
                  {subtitleTracks.map((track) => (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => onChangeSubtitle(track.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-sm font-bold transition",
                        selectedSubtitle === track.id
                          ? "bg-white text-slate-950"
                          : "bg-white/5 text-white/65 hover:bg-white/10"
                      )}
                    >
                      <span>
                        {track.label}
                        <span className="mr-2 text-xs opacity-60">
                          {track.language.toUpperCase()}
                        </span>
                      </span>
                      {selectedSubtitle === track.id ? <Check className="h-4 w-4" /> : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mb-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white/35">
                السطوع
              </p>
              <div className="rounded-2xl bg-white/5 px-3 py-3">
                <div className="mb-2 flex items-center justify-between text-sm font-bold text-white/75">
                  <span className="flex items-center gap-2">
                    <SunMedium className="h-4 w-4" />
                    سطوع المشغل
                  </span>
                  <span>{Math.round(brightness * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.3}
                  step={0.05}
                  value={brightness}
                  onChange={(event) => onChangeBrightness(Number(event.target.value))}
                  aria-label="السطوع"
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/20 accent-white"
                />
              </div>
            </div>

            <div className="space-y-2 border-t border-white/10 pt-4">
              <SettingsRow
                icon={Sparkles}
                label="الإضاءة المحيطية"
                value={isAmbientMode ? "مفعلة" : "متوقفة"}
                onClick={onToggleAmbient}
              />
              <SettingsRow
                icon={RotateCcw}
                label="إعادة التشغيل"
                value="0:00"
                onClick={onRestartPlayback}
              />
              <SettingsRow
                icon={Layers}
                label="إحصاءات المشغل"
                value="عرض"
                onClick={onOpenStats}
              />
              {canCopyLink ? (
                <SettingsRow
                  icon={Copy}
                  label="نسخ رابط الدرس"
                  value="نسخ"
                  onClick={onCopyLessonLink}
                />
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isStatsOpen ? (
          <m.div
            initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.97 }}
            transition={isEfficiencyMode ? { duration: 0 } : undefined}
            className={cn(
              "absolute inset-0 z-40 flex items-center justify-center bg-black/70 p-6",
              !isEfficiencyMode && "backdrop-blur-xl"
            )}
            onClick={onCloseStats}
          >
            <div
              className="w-full max-w-lg rounded-[30px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-xl font-black text-white">إحصاءات المشغل</p>
                  <p className="text-sm text-white/50">
                    معلومات مباشرة عن الجلسة الحالية
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onCloseStats}
                  className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                  aria-label="إغلاق الإحصاءات"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {statsItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                  >
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                      {item.label}
                    </p>
                    <p className="mt-2 text-lg font-black text-white">{item.value}</p>
                  </div>
                ))}
              </div>

              {audioTracks.length > 0 ? (
                <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                    مسارات صوتية متاحة
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {audioTracks.map((track) => (
                      <span
                        key={track.id}
                        className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/75"
                      >
                        {track.label} {track.language.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isHelpOpen ? (
          <m.div
            initial={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            animate={isEfficiencyMode ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={isEfficiencyMode ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={isEfficiencyMode ? { duration: 0 } : undefined}
            className={cn(
              "absolute inset-0 z-40 flex items-center justify-center bg-black/75 p-6",
              !isEfficiencyMode && "backdrop-blur-xl"
            )}
            onClick={onCloseHelp}
          >
            <div
              className="w-full max-w-2xl rounded-[30px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300">
                    <Keyboard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xl font-black text-white">
                      اختصارات لوحة المفاتيح
                    </p>
                    <p className="text-sm text-white/50">
                      اضغط داخل المشغل أولًا ثم استخدم الاختصارات
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onCloseHelp}
                  className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                  aria-label="إغلاق المساعدة"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {shortcuts.map(([shortcut, description]) => (
                  <div
                    key={shortcut}
                    className="flex items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm font-bold text-white/75">
                      {description}
                    </span>
                    <kbd className="rounded-xl border border-white/10 bg-black/40 px-2 py-1 text-xs font-black text-blue-200">
                      {shortcut}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {isSidebarOpen ? (
          <m.aside
            initial={isEfficiencyMode ? { opacity: 0 } : { x: 360, opacity: 0 }}
            animate={isEfficiencyMode ? { opacity: 1 } : { x: 0, opacity: 1 }}
            exit={isEfficiencyMode ? { opacity: 0 } : { x: 360, opacity: 0 }}
            transition={isEfficiencyMode ? { duration: 0 } : undefined}
            className={cn(
              "absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-[360px] flex-col border-r border-white/10 bg-slate-950/92 p-4 shadow-2xl",
              !isEfficiencyMode && "backdrop-blur-2xl"
            )}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black text-white">لوحة الدراسة</p>
                <p className="text-xs text-white/50">
                  نقاط زمنية وملاحظات وانتقال بين الدروس
                </p>
              </div>
              <button
                type="button"
                onClick={onCloseSidebar}
                className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white"
                aria-label="إغلاق اللوحة الجانبية"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 flex gap-2 rounded-[24px] bg-white/5 p-1">
              <SidebarTabButton
                active={sidebarTab === "bookmarks"}
                icon={Bookmark}
                label="المعالم"
                onClick={() => onToggleSidebarTab("bookmarks")}
              />
              <SidebarTabButton
                active={sidebarTab === "notes"}
                icon={MessageSquare}
                label="ملاحظات"
                onClick={() => onToggleSidebarTab("notes")}
              />
              <SidebarTabButton
                active={sidebarTab === "lessons"}
                icon={ListVideo}
                label="دروس"
                onClick={() => onToggleSidebarTab("lessons")}
              />
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
              {sidebarTab === "bookmarks" ? (
                bookmarks.length > 0 ? (
                  <div className="space-y-3">
                    {bookmarks.map((bookmark) => (
                      <button
                        key={`${bookmark.time}-${bookmark.label}`}
                        type="button"
                        onClick={() => onJumpToTime(bookmark.time)}
                        className="flex w-full items-start justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-right transition hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-sm font-black text-white">
                            {bookmark.label}
                          </p>
                          <p className="mt-1 text-xs text-white/50">
                            انتقال إلى {formatDuration(bookmark.time)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">
                          {formatDuration(bookmark.time)}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptySidebarState
                    icon={Bookmark}
                    label="لا توجد معالم زمنية لهذا الدرس بعد."
                  />
                )
              ) : null}

              {sidebarTab === "notes" ? (
                <div className="space-y-4">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <label className="block text-xs font-bold uppercase tracking-[0.2em] text-white/35">
                        أضف ملاحظة عند الوقت الحالي
                      </label>
                      <span className="text-xs font-bold text-white/40">
                        {isNotesSyncing ? "جارٍ المزامنة..." : "مزامنة سحابية"}
                      </span>
                    </div>
                    <textarea
                      value={noteDraft}
                      onChange={(event) => onNoteDraftChange(event.target.value)}
                      placeholder="اكتب فكرة مهمة أو سؤالًا للمراجعة..."
                      className="min-h-[110px] w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/30"
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={onAddNoteAtCurrentTime}
                        disabled={!noteDraft.trim()}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Clock3 className="h-4 w-4" />
                        حفظ عند {formatDuration(currentTime)}
                      </button>
                      <button
                        type="button"
                        onClick={onInsertTimestamp}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white"
                      >
                        طابع زمني
                      </button>
                    </div>
                  </div>

                  {notes.length > 0 ? (
                    <div className="space-y-3">
                      {notes.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onJumpToTime(note.time)}
                              className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-200 transition hover:bg-amber-500/20"
                            >
                              {formatDuration(note.time)}
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemoveNote(note.id)}
                              className="text-xs font-bold text-white/40 transition hover:text-white/75"
                            >
                              حذف
                            </button>
                          </div>
                          <p className="mt-3 text-sm leading-7 text-white/80">
                            {note.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <EmptySidebarState
                      icon={MessageSquare}
                      label="لا توجد ملاحظات زمنية لهذا الدرس بعد."
                    />
                  )}
                </div>
              ) : null}

              {sidebarTab === "lessons" ? (
                lessons.length > 0 ? (
                  <div className="space-y-3">
                    {lessons.map((lesson, index) => {
                      const isActive = lesson.id === lessonId;
                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => onLessonChange?.(lesson.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-[24px] border p-4 text-right transition",
                            isActive
                              ? "border-blue-400/30 bg-blue-500/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
                              lesson.completed
                                ? "bg-emerald-500 text-white"
                                : isActive
                                  ? "bg-blue-500 text-white"
                                  : "bg-white/10 text-white/65"
                            )}
                          >
                            {lesson.completed ? <Check className="h-4 w-4" /> : index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-white">
                              {lesson.title}
                            </p>
                            <p className="mt-1 text-xs text-white/50">
                              {formatDuration(lesson.duration)}
                            </p>
                          </div>
                          {isActive ? (
                            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">
                              الحالي
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <EmptySidebarState
                    icon={ListVideo}
                    label="لا توجد قائمة دروس مرتبطة بهذا المشغل."
                  />
                )
              ) : null}
            </div>
          </m.aside>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  value,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl bg-white/5 px-3 py-3 text-sm font-bold text-white/80 transition hover:bg-white/10"
    >
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </span>
      <span>{value}</span>
    </button>
  );
}

function EmptySidebarState({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
      <Icon className="mx-auto h-10 w-10 text-white/25" />
      <p className="mt-4 text-sm font-bold text-white/75">{label}</p>
    </div>
  );
}
