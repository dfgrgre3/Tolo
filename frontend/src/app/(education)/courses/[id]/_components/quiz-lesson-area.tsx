"use client";

import { useState } from "react";
import { Lock, HelpCircle, Loader2, ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CourseLesson } from "./types";
import { useCourseQuiz, useQuizResults, useSubmitQuiz } from "@/hooks/use-course-quizzes";
import { QuizPlayer } from "@/components/quiz/QuizPlayer";
import type { QuizResult } from "@/types/course-quiz";

/**
 * Renders the interactive quiz experience for a QUIZ-type lesson.
 * Falls back to a locked state when the user hasn't enrolled and the lesson
 * isn't a free preview.
 */
export function QuizLessonArea({
  canAccess,
  lessonData,
  courseId,
  onEnroll,
}: {
  canAccess: boolean;
  lessonData: CourseLesson;
  courseId: string;
  onEnroll: () => void;
}) {
  const [submittedResult, setSubmittedResult] = useState<QuizResult | null>(null);
  const { data: quizzes, isLoading } = useCourseQuiz(courseId, lessonData.id);
  const { data: results } = useQuizResults(
    canAccess ? courseId : undefined,
    canAccess && quizzes?.[0]?.id ? quizzes[0].id : undefined
  );
  const submitQuizMutation = useSubmitQuiz();

  const quiz = quizzes?.[0];

  if (!canAccess) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-[28px]">
        <Lock className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300 mb-2">الاختبار مقفل</h3>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">
          سجل في الدورة لتتمكن من حل الاختبارات والواجبات.
        </p>
        <Button onClick={onEnroll} className="gap-2 rounded-xl bg-primary text-white shadow-lg">
          <Lock className="h-4 w-4" />
          <span>سجل الآن</span>
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="aspect-video flex flex-col items-center justify-center p-8 text-center bg-gray-50 dark:bg-gray-800 rounded-[28px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-gray-500 font-medium">جاري تحميل الاختبار...</p>
      </div>
    );
  }

  // Show previous attempt result if available and the quiz isn't retake-able
  if (!quiz) {
    return (
      <div className="rounded-[28px] border border-dashed border-gray-200 dark:border-white/10 p-8 text-center space-y-3">
        <ClipboardList className="h-10 w-10 text-gray-300 mx-auto" />
        <p className="text-gray-500 font-medium">لا يوجد اختبار مرتبط بهذا الدرس.</p>
      </div>
    );
  }

  // If the user has already passed and can't retake, show their last result
  const bestPassed = results?.some((r) => r.attempt.passed);
  const canRetake = quiz.maxAttempts > 1;
  if (bestPassed && !canRetake && !submittedResult) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8 flex flex-col items-center text-center space-y-3">
        <div className="h-14 w-14 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h4 className="text-lg font-bold text-gray-900 dark:text-white">أنجزت هذا الاختبار بنجاح</h4>
        <p className="text-sm text-gray-500">
          حصلت على أفضل نتيجة. لقد أتممت متطلبات هذا الدرس.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {results?.map((r) => (
            <div key={r.attempt.id} className="rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-white/5 p-3 text-center">
              <p className="text-xl font-black text-emerald-500">{r.attempt.percentage}%</p>
              <p className="text-[10px] text-gray-400">{r.attempt.score} / {r.attempt.maxScore} نقطة</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <QuizPlayer
      quiz={quiz}
      onSubmit={async (answers, timeSpentSeconds) => {
        try {
          const result = await submitQuizMutation.mutateAsync({
            courseId,
            quizId: quiz.id,
            payload: { answers, timeSpentSeconds },
          });
          setSubmittedResult(result);
          return result;
        } catch {
          return null;
        }
      }}
    />
  );
}

/** Small header used above the quiz area showing lesson type badge. */
export function QuizLessonBadge({ lesson }: { lesson: CourseLesson }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold",
        "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
      )}
    >
      <HelpCircle className="h-3 w-3" />
      اختبار تفاعلي
    </span>
  );
}
