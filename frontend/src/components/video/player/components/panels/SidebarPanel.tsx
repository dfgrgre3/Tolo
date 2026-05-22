'use client';

import { AnimatePresence, m } from "framer-motion";
import { Bookmark, Check, ChevronRight, Clock3, ListVideo, MessageSquare } from "lucide-react";
import { formatDuration } from "../../utils";
import { SidebarTabButton } from "../SidebarTabButton";
import { cn } from "@/lib/utils";

function EmptySidebarState({ icon: Icon, label }: any) {
  return (
    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-center">
      <Icon className="mx-auto h-10 w-10 text-white/25" />
      <p className="mt-4 text-sm font-bold text-white/75">{label}</p>
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
        <button key={`${bookmark.time}-${bookmark.label}`} type="button" onClick={() => onJumpToTime(bookmark.time)}
          className="flex w-full items-start justify-between gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-right transition hover:bg-white/10">
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm font-black text-white">{bookmark.label}</p>
            <p className="mt-1 text-xs text-white/50">انتقال إلى {formatDuration(bookmark.time)}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-500/15 px-3 py-1 text-xs font-bold text-blue-200">{formatDuration(bookmark.time)}</span>
        </button>
      ))}
    </div>
  );
}

function NotesTab({ noteDraft, onNoteDraftChange, isNotesSyncing, onAddNoteAtCurrentTime, onInsertTimestamp, currentTime, notes, onRemoveNote, onJumpToTime }: any) {
  return (
    <div className="space-y-4">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="block text-xs font-bold uppercase tracking-[0.2em] text-white/35">أضف ملاحظة عند الوقت الحالي</label>
          <span className="text-xs font-bold text-white/40">{isNotesSyncing ? "جارٍ المزامنة..." : "مزامنة سحابية"}</span>
        </div>
        <textarea value={noteDraft} onChange={(event) => onNoteDraftChange(event.target.value)}
          placeholder="اكتب فكرة مهمة أو سؤالًا للمراجعة..."
          className="min-h-[110px] w-full rounded-[22px] border border-white/10 bg-black/30 px-4 py-3 text-sm leading-7 text-white outline-none transition placeholder:text-white/30 focus:border-blue-400/30" />
        <div className="mt-3 flex items-center gap-2">
          <button type="button" onClick={onAddNoteAtCurrentTime} disabled={!noteDraft.trim()}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-black text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
            <Clock3 className="h-4 w-4" /> حفظ عند {formatDuration(currentTime)}
          </button>
          <button type="button" onClick={onInsertTimestamp}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
            طابع زمني
          </button>
        </div>
      </div>
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note: any) => (
            <div key={note.id} className="rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <button type="button" onClick={() => onJumpToTime(note.time)}
                  className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-200 transition hover:bg-amber-500/20">
                  {formatDuration(note.time)}
                </button>
                <button type="button" onClick={() => onRemoveNote(note.id)} className="text-xs font-bold text-white/40 transition hover:text-white/75">حذف</button>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/80">{note.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptySidebarState icon={MessageSquare} label="لا توجد ملاحظات زمنية لهذا الدرس بعد." />
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
          <button key={lesson.id} type="button" onClick={() => onLessonChange?.(lesson.id)}
            className={cn("flex w-full items-center gap-3 rounded-[24px] border p-4 text-right transition",
              isActive ? "border-blue-400/30 bg-blue-500/10" : "border-white/10 bg-white/5 hover:bg-white/10")}>
            <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-black",
              lesson.completed ? "bg-emerald-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-white/10 text-white/65")}>
              {lesson.completed ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">{lesson.title}</p>
              <p className="mt-1 text-xs text-white/50">{formatDuration(lesson.duration)}</p>
            </div>
            {isActive ? <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">الحالي</span> : null}
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
  lessons, lessonId, onLessonChange, onCloseSidebar,
}: any) {
  let initialAnim: any = { x: 360, opacity: 0 };
  let animateAnim: any = { x: 0, opacity: 1 };
  let exitAnim: any = { x: 360, opacity: 0 };
  let transitionAnim: any = undefined;
  let bgClass = "backdrop-blur-2xl";

  if (isEfficiencyMode) {
    initialAnim = { opacity: 0 };
    animateAnim = { opacity: 1 };
    exitAnim = { opacity: 0 };
    transitionAnim = { duration: 0 };
    bgClass = "";
  }

  return (
    <AnimatePresence>
      {isSidebarOpen ? (
        <m.aside
          initial={initialAnim} animate={animateAnim} exit={exitAnim} transition={transitionAnim}
          className={cn("absolute bottom-0 right-0 top-0 z-30 flex w-full max-w-[360px] flex-col border-r border-white/10 bg-slate-950/92 p-4 shadow-2xl", bgClass)}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-white">لوحة الدراسة</p>
              <p className="text-xs text-white/50">نقاط زمنية وملاحظات وانتقال بين الدروس</p>
            </div>
            <button type="button" onClick={onCloseSidebar}
              className="rounded-full p-2 text-white/40 transition hover:bg-white/10 hover:text-white" aria-label="إغلاق اللوحة الجانبية">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4 flex gap-2 rounded-[24px] bg-white/5 p-1">
            <SidebarTabButton active={sidebarTab === "bookmarks"} icon={Bookmark} label="المعالم" onClick={() => onToggleSidebarTab("bookmarks")} />
            <SidebarTabButton active={sidebarTab === "notes"} icon={MessageSquare} label="ملاحظات" onClick={() => onToggleSidebarTab("notes")} />
            <SidebarTabButton active={sidebarTab === "lessons"} icon={ListVideo} label="دروس" onClick={() => onToggleSidebarTab("lessons")} />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {sidebarTab === "bookmarks" ? <BookmarksTab bookmarks={bookmarks} onJumpToTime={onJumpToTime} /> : null}
            {sidebarTab === "notes" ? (
              <NotesTab noteDraft={noteDraft} onNoteDraftChange={onNoteDraftChange} isNotesSyncing={isNotesSyncing}
                onAddNoteAtCurrentTime={onAddNoteAtCurrentTime} onInsertTimestamp={onInsertTimestamp}
                currentTime={currentTime} notes={notes} onRemoveNote={onRemoveNote} onJumpToTime={onJumpToTime} />
            ) : null}
            {sidebarTab === "lessons" ? <LessonsTab lessons={lessons} lessonId={lessonId} onLessonChange={onLessonChange} /> : null}
          </div>
        </m.aside>
      ) : null}
    </AnimatePresence>
  );
}
