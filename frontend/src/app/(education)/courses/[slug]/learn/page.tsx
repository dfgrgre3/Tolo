import { redirect } from "next/navigation";

import { getCourseDetailHydration } from "@/lib/course/course-domain-service";
import { ApiError } from "@/lib/api/api-client";
import type { LessonRowDTO } from "@/types/domain/mappers";

interface Props {
  params: Promise<{ slug: string }>;
}

// The course page links here for "continue learning". The target depends on who
// is asking and how far they have gotten, so this route resolves it server-side
// from the same hydration snapshot the hub uses and redirects — it deliberately
// emits a temporary redirect, never a permanent one: the resume point moves as
// the learner progresses, and a cached 301 would pin a stale lesson.
async function resolveResumeLesson(slug: string): Promise<string | null> {
  try {
    const hydration = await getCourseDetailHydration(slug);
    const lessons = hydration.lessons ?? [];
    if (lessons.length === 0) return null;

    // Mirrors the hub's own resolution order: the first lesson that is unlocked
    // and not yet finished, else the first lesson at all. A visitor (not
    // enrolled) only ever lands on a free preview lesson this way, because the
    // backend marks the rest locked.
    const next =
      lessons.find((lesson: LessonRowDTO) => !lesson.locked && !lesson.completed) ??
      lessons.find((lesson: LessonRowDTO) => !lesson.locked) ??
      lessons[0];
    return next?.id ?? null;
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      console.error("Error resolving resume lesson:", error);
    }
    return null;
  }
}

export default async function LearnIndexPage({ params }: Props) {
  const { slug } = await params;
  const lessonId = await resolveResumeLesson(slug);

  // No resumable lesson (empty curriculum, or the course is not visible to this
  // caller): fall back to the course page rather than rendering an empty player.
  if (!lessonId) {
    redirect(`/courses/${slug}`);
  }

  redirect(`/courses/${slug}/learn/${lessonId}`);
}
