"use client";

import { AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { useLearningHub } from "./hooks/useLearningHub";
import { LearningHubHeader } from "./components/LearningHubHeader";
import { LearningHubSidebar } from "./components/LearningHubSidebar";
import { LessonPlayerSection } from "./components/LessonPlayerSection";
import { LessonStatsSection } from "./components/LessonStatsSection";
import { LessonTabsSection } from "./components/LessonTabsSection";
import { LessonNavigationFooter } from "./components/LessonNavigationFooter";
import { LearningHubLoading, LearningHubError } from "./components/LearningHubStates";

export default function AdvancedLearningHub() {
  const router = useRouter();
  const hub = useLearningHub();

  if (hub.loading) {
    return <LearningHubLoading />;
  }

  if (!hub.course || !hub.activeLesson) {
    return <LearningHubError courseId={hub.courseId} />;
  }

  return (
    <div className="min-h-screen bg-[#fffdf9] text-slate-900 dark:bg-[#09090b] dark:text-white" dir="rtl">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute right-[-10%] top-[-8%] h-[380px] w-[380px] rounded-full bg-orange-500/12 blur-[120px]" />
        <div className="absolute left-[-8%] top-[20%] h-[320px] w-[320px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <LearningHubHeader
        course={hub.course}
        courseId={hub.courseId}
        sidebarOpen={hub.sidebarOpen}
        setSidebarOpen={hub.setSidebarOpen}
        autoPlayNext={hub.autoPlayNext}
        setAutoPlayNext={hub.setAutoPlayNext}
        isTheaterMode={hub.isTheaterMode}
        setIsTheaterMode={hub.setIsTheaterMode}
      />

      <div className="mx-auto max-w-[1700px] px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <AnimatePresence initial={false}>
            {hub.sidebarOpen && (
              <LearningHubSidebar
                course={hub.course}
                chapters={hub.chapters}
                filteredChapters={hub.filteredChapters}
                activeLessonId={hub.activeLessonId}
                lessonSearch={hub.lessonSearch}
                setLessonSearch={hub.setLessonSearch}
                navigateToLesson={hub.navigateToLesson}
                progress={hub.progress}
                allLessons={hub.allLessons}
                totalDurationMinutes={hub.totalDurationMinutes}
                totalAttachments={hub.totalAttachments}
              />
            )}
          </AnimatePresence>

          <main className="space-y-6">
            <LessonPlayerSection
              course={hub.course}
              activeLesson={hub.activeLesson}
              lessonIndex={hub.lessonIndex}
              totalLessons={hub.allLessons.length}
              bookmarks={hub.bookmarks}
              previousLesson={hub.previousLesson ?? null}
              nextLesson={hub.nextLesson ?? null}
              navigateRelative={hub.navigateRelative}
              handleLessonComplete={hub.handleLessonComplete}
              isTheaterMode={hub.isTheaterMode}
              setIsTheaterMode={hub.setIsTheaterMode}
              autoPlayNext={hub.autoPlayNext}
              navigateToLesson={hub.navigateToLesson}
              playerApiRef={hub.playerApiRef}
            />

            <LessonStatsSection
              progress={hub.progress}
              allLessonsCount={hub.allLessons.length}
              completedLessonsCount={hub.allLessons.filter(l => l.completed).length}
              activeLesson={hub.activeLesson}
              bookmarksCount={hub.bookmarks.length}
            />

            <LessonTabsSection
              activeTab={hub.activeTab}
              setActiveTab={hub.setActiveTab}
              activeLesson={hub.activeLesson}
              questions={hub.questions}
              newQuestion={hub.newQuestion}
              setNewQuestion={hub.setNewQuestion}
              postingQuestion={hub.postingQuestion}
              postQuestion={hub.postQuestion}
              noteContent={hub.noteContent}
              setNoteContent={hub.setNoteContent}
              savingNote={hub.savingNote}
              saveNote={hub.saveNote}
              addTimestampToNotes={hub.addTimestampToNotes}
              aiMessages={hub.aiMessages}
              aiInput={hub.aiInput}
              setAiInput={hub.setAiInput}
              aiLoading={hub.aiLoading}
              sendAiMessage={hub.sendAiMessage}
            />

            <LessonNavigationFooter
              previousLesson={hub.previousLesson}
              nextLesson={hub.nextLesson}
              navigateRelative={hub.navigateRelative}
              course={hub.course}
              lessonIndex={hub.lessonIndex}
              totalLessons={hub.allLessons.length}
            />

            {hub.progress === 100 && (
              <section className="rounded-[32px] border border-emerald-500/20 bg-emerald-500/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-500 p-3 text-white">
                      <Trophy className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        أنهيت الدورة بالكامل
                      </h3>
                      <p className="mt-1 text-sm leading-7 text-emerald-700/80 dark:text-emerald-200/80">
                        ممتاز. يمكنك الآن مراجعة ملاحظاتك، إعادة أهم المقاطع،
                        ثم العودة إلى صفحة الدورة لمتابعة شهادتك أو تقييمك.
                      </p>
                    </div>
                  </div>

                  <Button
                    className="rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => router.push(`/courses/${hub.courseId}`)}
                  >
                    العودة إلى الدورة
                  </Button>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
