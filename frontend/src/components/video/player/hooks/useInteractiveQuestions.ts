import { useEffect, useMemo, useState } from "react";
import {
  fetchLessonQuestions,
  sanitizeQuestions,
} from "@/lib/lesson-questions";
import type { InteractiveQuestion } from "../types";

type UseInteractiveQuestionsOptions = {
  lessonId: string;
  /** Embedded/fallback questions (lesson payload props). Sanitized. */
  initialQuestions?: InteractiveQuestion[];
  /** Escape hatch for offline/test scenarios. Default: server-first. */
  disabled?: boolean;
};

/**
 * Server-first interactive questions.
 *
 * The stripped server list (no answer key) is authoritative whenever it
 * loads; embedded props are sanitized (answer key dropped unless explicitly
 * formative) and used as the instant fallback — including when the backend
 * does not implement the endpoint yet (fetch throws → props stay).
 */
export function useInteractiveQuestions({
  lessonId,
  initialQuestions = [],
  disabled = false,
}: UseInteractiveQuestionsOptions) {
  const [serverQuestions, setServerQuestions] = useState<InteractiveQuestion[] | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting cached questions when lesson changes before refetch; intentional sync
    setServerQuestions(null);
    if (disabled || !lessonId) return;
    let cancelled = false;
    void fetchLessonQuestions(lessonId)
      .then((qs) => {
        if (!cancelled) setServerQuestions(qs);
      })
      .catch(() => {
        if (!cancelled) setServerQuestions(null);
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId, disabled]);

  const questions = useMemo(
    () => serverQuestions ?? sanitizeQuestions(initialQuestions),
    [serverQuestions, initialQuestions],
  );

  return { questions, isFromServer: serverQuestions !== null };
}
