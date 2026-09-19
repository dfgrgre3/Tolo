import { useCallback, useEffect, useMemo, useState } from "react";
import { parseTranscript, searchTranscriptCues } from "../utils";
import type { TranscriptCue } from "../types";
import { getLessonTranscript } from "@/services/api/lesson-content-service";

/**
 * Fetches and parses a lesson's transcript (admin-uploaded SRT/VTT, see
 * GetLessonTranscript on the backend), and exposes an Arabic-normalized,
 * ranked search over cues — powers the sidebar's transcript tab.
 */
export function useTranscript({ lessonId }: { lessonId: string }) {
  const [cues, setCues] = useState<TranscriptCue[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadTranscript = useCallback(async (isCancelled: () => boolean) => {
    setIsLoading(true);
    try {
      const payload = await getLessonTranscript(lessonId);
      if (isCancelled()) return;

      const content: string = payload?.content ?? "";
      if (isCancelled()) return;
      setCues(content ? parseTranscript(content) : []);
    } catch {
      if (!isCancelled()) setCues([]);
    } finally {
      if (!isCancelled()) setIsLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      loadTranscript(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [loadTranscript]);

  // P1-23: normalized + ranked (phrase > all-tokens > none). First result
  // is the jump-to-match target.
  const filteredCues = useMemo(() => searchTranscriptCues(cues, query), [cues, query]);

  return {
    hasTranscript: cues.length > 0,
    cues: filteredCues,
    query,
    setQuery,
    isLoading,
  };
}
