'use client';

import { AnimatePresence, m } from "framer-motion";
import { Bookmark, Check, ChevronRight, Clock3, ListVideo, MessageSquare, Search, FileText } from "lucide-react";
import { formatDuration } from "../../utils";
import type { TranscriptCue } from "../../types";
import { SidebarTabButton } from "../SidebarTabButton";
import { cn } from "@/lib/utils";

function EmptySidebarState({ icon: Icon, label }: any) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.05] p-6 text-center">
      <Icon className="mx-auto h-12 w-12 text-white/35" />
      <p className="mt-4 text-base font-bold text-white/85">{label}</p>
    </div>
  );
}

function BookmarksTab({ bookmarks, onJumpToTime }: any) {
  if (bookmarks.length === 0) {
    return <EmptySidebarState icon={Bookmark} label="لا توجد معالم زمنية لهذا الدرس بعد." />;
  }
  return (
    <div className="space-y-3">
      {bookmarks.map((bookmark: any) => (
        <button 
          key={`${bookmark.time}-${bookmark.label}`} 
          type="button" 
          onClick={() => onJumpToTime(bookmark.time)}
          className="flex w-full items-start justify-between gap-3 rounded-[24px] border border-white/15 bg-white/8 px-4 py-3.5 active:bg-white/15 text-right transition hover:bg-white/12"
        >
          <div className="min-w-0">
            <p className="line-clamp-2 text-base font-black text-white">{bookmark.label}</p>
            <p className="mt-1.5 text-sm text-white/60">انتقال إلى {formatDuration(bookmark.time)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/20 px-3.5 py-1.5 text-sm font-bold text-blue-200">{formatDuration(bookmark.time)}</span>
        </button>
      ))}
    </div>
  );
}

function NotesTab({ noteDraft, onNoteDraftChange, isNotesSyncing, onAddNoteAtCurrentTime, onInsertTimestamp, currentTime, notes, onRemoveNote, onJumpToTime }: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/15 bg-white/[0.05] p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="block text-sm font-bold uppercase tracking-[0.2em] text-white/45">أضف ملاحظة عند الوقت الحالي</label>
          <span className="text-sm font-bold text-white/50">{isNotesSyncing ? "جارٍ المزامنة..." : "مزامنة سحابية"}</span>
        </div>
        <textarea 
          value={noteDraft} 
          onChange={(event) => onNoteDraftChange(event.target.value)}
          placeholder="اكتب فكرة مهمة أو سؤالًا للمراجعة..."
          className="min-h-[120px] w-full rounded-[22px] border border-white/15 bg-black/40 px-4 py-3.5 text-base leading-7 text-white outline-none transition placeholder:text-white/40 focus:border-blue-400/40" 
        />
        <div className="mt-3.5 flex items-center gap-2.5">
          <button 
            type="button" 
            onClick={onAddNoteAtCurrentTime} 
            disabled={!noteDraft.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2.5 rounded-2xl bg-blue-500 px-4 py-3.5 text-base font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
          >
            <Clock3 className="h-5 w-5" /> حفظ عند {formatDuration(currentTime)}
          </button>
          <button 
            type="button" 
            onClick={onInsertTimestamp}
            className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3.5 text-base font-bold text-white/85 transition hover:bg-white/12 active:scale-95"
          >
            طابع زمني
          </button>
        </div>
      </div>
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <div key={note.id} className="rounded-[24px] border border-white/15 bg-white/8 p-4">
              <div className="flex items-center justify-between gap-2.5">
                <button 
                  type="button" 
                  onClick={() => onJumpToTime(note.time)}
                  className="rounded-full bg-amber-500/20 px-3.5 py-1.5 text-sm font-black text-amber-200 transition hover:bg-amber-500/30"
                >
                  {formatDuration(note.time)}
                </button>
                <button 
                  type="button" 
                  onClick={() => onRemoveNote(note.id)} 
                  className="text-sm font-bold text-white/50 transition hover:text-white/85"
                >
                  حذف
                </button>
              </div>
              <p className="mt-3 text-base leading-7 text-white/90">{note.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptySidebarState icon={MessageSquare} label="لا توجد ملاحظات زمنية لهذا الدرس بعد." />
      )}
    </div>
  );
}

function TranscriptTab({
  hasTranscript,
  cues,
  query,
  onQueryChange,
  onJumpToTime,
  currentTime,
}: {
  hasTranscript: boolean;
  cues: TranscriptCue[];
  query: string;
  onQueryChange: (value: string) => void;
  onJumpToTime: (time: number) => void;
  currentTime: number;
}) {
  if (!hasTranscript) {
    return <EmptySidebarState icon={FileText} label="لا يوجد نص مكتوب متاح لهذا الدرس بعد." />;
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute right-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="ابحث داخل نص الفيديو..."
          className="w-full rounded-[22px] border border-white/15 bg-black/40 py-3.5 pr-11 pl-4 text-base text-white outline-none transition placeholder:text-white/40 focus:border-blue-400/40"
        />
      </div>

      {cues.length === 0 ? (
        <EmptySidebarState icon={Search} label="لا توجد نتائج مطابقة لبحثك." />
      ) : (
        <div className="space-y-2">
          {cues.map((cue) => {
            const isActive = currentTime >= cue.start && currentTime < cue.end;
            return (
              <button
                key={cue.id}
                type="button"
                onClick={() => onJumpToTime(cue.start)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-[20px] border px-4 py-3 text-right transition",
                  isActive
                    ? "border-blue-400/40 bg-blue-500/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                )}
              >
                <span className="mt-0.5 shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-black text-white/70">
                  {formatDuration(cue.start)}
                </span>
                <p className="text-sm leading-6 text-white/90">{cue.text}</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LessonsTab({ lessons, lessonId, onLessonChange }: any) {
  if (lessons.length === 0) {
    return <EmptySidebarState icon={ListVideo} label="لا توجد قائمة دروس مرتبطة بهذا المشغل." />;
  }
  return (
    <div className="space-y-3">
      {lessons.map((lesson: any, index: number) => {
        const isActive = lesson.id === lessonId;
        return (
          <button 
            key={lesson.id} 
            type="button" 
            onClick={() => onLessonChange?.(lesson.id)}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-[24px] border p-4 text-right transition active:scale-95",
              isActive 
                ? "border-blue-400/40 bg-blue-500/15 scale-100" 
                : "border-white/15 bg-white/8 hover:bg-white/12 scale-100"
            )}
          >
            <div className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black transition-transform",
              lesson.completed 
                ? "bg-emerald-500 text-white" 
                : isActive 
                  ? "bg-blue-500 text-white" 
                  : "bg-white/15 text-white/75"
            )}>
              {lesson.completed ? <Check className="h-4.5 w-4.5" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-black text-white">{lesson.title}</p>
              <p className="mt-1.5 text-sm text-white/55">{formatDuration(lesson.duration)}</p>
            </div>
            {isActive ? <span className="rounded-full bg-white px-3.5 py-1.5 text-[11px] font-black text-slate-950">الحالي</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SidebarPanel({
  isSidebarOpen, isEfficiencyMode, sidebarTab, onToggleSidebarTab,
  bookmarks, onJumpToTime, noteDraft, onNoteDraftChange, isNotesSyncing,
  onAddNoteAtCurrentTime, onInsertTimestamp, currentTime, notes, onRemoveNote,
  hasTranscript, transcriptCues, transcriptQuery, onTranscriptQueryChange,
  lessons, lessonId, onLessonChange, onCloseSidebar,
}: any) {
  // Mobile: slide up from bottom, full width
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
  
  return (
    <AnimatePresence>
      {isSidebarOpen ? (
        <m.aside
          initial={isMobile ? { y: "100%" } : { x: 360, opacity: 0 }}
          animate={isMobile ? { y: 0 } : { x: 0, opacity: 1 }}
          exit={isMobile ? { y: "100%" } : { x: 360, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed inset-0 z-30 flex h-full w-full flex-col bg-slate-950", // Mobile full screen
            "sm:absolute sm:bottom-0 sm:right-0 sm:top-0 sm:max-w-[360px] sm:border-r sm:border-white/10 sm:bg-slate-950/92 sm:p-4 sm:shadow-2xl sm:h-auto sm:w-auto sm:rounded-t-3xl", // Desktop
            isMobile ? "" : "rounded-t-3xl sm:rounded-t-none" // Mobile has no rounded top
          )}
        >
          {/* Mobile drag handle */}
          {isMobile && (
            <div className="flex justify-center py-3">
              <div className="h-1.5 w-12 rounded-full bg-white/25" />
            </div>
          )}
          
          <div className="mb-4 flex items-center justify-between px-4 sm:px-0">
            <div>
              <p className="text-xl font-black text-white sm:text-lg">لوحة الدراسة</p>
              <p className="text-sm text-white/55 sm:text-xs">نقاط زمنية وملاحظات وانتقال بين الدروس</p>
            </div>
            <button 
              type="button" 
              onClick={onCloseSidebar}
              className="rounded-full p-2.5 text-white/50 transition hover:bg-white/10 hover:text-white sm:p-2" 
              aria-label="إغلاق اللوحة الجانبية"
            >
              <ChevronRight className="h-6 w-6 sm:h-5 sm:w-5" />
            </button>
          </div>
          
          {/* Tab buttons - larger on mobile */}
          <div className="mb-4 mx-4 flex gap-2.5 rounded-[24px] bg-white/10 p-1.5 sm:mx-0 sm:mb-4 sm:gap-2 sm:rounded-[24px] sm:bg-white/5 sm:p-1">
            <SidebarTabButton 
              active={sidebarTab === "bookmarks"} 
              icon={Bookmark} 
              label="المعالم" 
              onClick={() => onToggleSidebarTab("bookmarks")} 
              className="flex-1 py-2.5 text-sm sm:flex-auto sm:py-0 sm:text-xs"
            />
            <SidebarTabButton 
              active={sidebarTab === "notes"} 
              icon={MessageSquare} 
              label="ملاحظات" 
              onClick={() => onToggleSidebarTab("notes")} 
              className="flex-1 py-2.5 text-sm sm:flex-auto sm:py-0 sm:text-xs"
            />
            <SidebarTabButton
              active={sidebarTab === "lessons"}
              icon={ListVideo}
              label="دروس"
              onClick={() => onToggleSidebarTab("lessons")}
              className="flex-1 py-2.5 text-sm sm:flex-auto sm:py-0 sm:text-xs"
            />
            <SidebarTabButton
              active={sidebarTab === "transcript"}
              icon={FileText}
              label="النص"
              onClick={() => onToggleSidebarTab("transcript")}
              className="flex-1 py-2.5 text-sm sm:flex-auto sm:py-0 sm:text-xs"
            />
          </div>
          
          {/* Content - with extra padding on mobile for thumb access */}
          <div className={cn(
            "flex-1 overflow-y-auto",
            isMobile ? "px-4 pb-32" : "pr-1 sm:px-0"
          )}>
            {sidebarTab === "bookmarks" ? <BookmarksTab bookmarks={bookmarks} onJumpToTime={onJumpToTime} /> : null}
            {sidebarTab === "notes" ? (
              <NotesTab noteDraft={noteDraft} onNoteDraftChange={onNoteDraftChange} isNotesSyncing={isNotesSyncing}
                onAddNoteAtCurrentTime={onAddNoteAtCurrentTime} onInsertTimestamp={onInsertTimestamp}
                currentTime={currentTime} notes={notes} onRemoveNote={onRemoveNote} onJumpToTime={onJumpToTime} />
            ) : null}
            {sidebarTab === "lessons" ? <LessonsTab lessons={lessons} lessonId={lessonId} onLessonChange={onLessonChange} /> : null}
            {sidebarTab === "transcript" ? (
              <TranscriptTab
                hasTranscript={hasTranscript}
                cues={transcriptCues}
                query={transcriptQuery}
                onQueryChange={onTranscriptQueryChange}
                onJumpToTime={onJumpToTime}
                currentTime={currentTime}
              />
            ) : null}
          </div>
          
          {/* Mobile: Safe area padding for iPhone notch/home indicator */}
          {isMobile && <div className="h-8" />}
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
}