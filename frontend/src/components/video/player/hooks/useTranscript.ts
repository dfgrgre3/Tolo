import { useCallback, useEffect, useMemo, useState } from "react";
import { parseTranscript } from "../utils";
import type { TranscriptCue } from "../types";

/**
 * Fetches and parses a lesson's transcript (admin-uploaded SRT/VTT, see
 * GetLessonTranscript on the backend), and exposes a search query that
 * filters cues by text — powers the sidebar's transcript tab.
 */
export function useTranscript({ lessonId }: { lessonId: string }) {
  const [cues, setCues] = useState<TranscriptCue[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const loadTranscript = useCallback(async (isCancelled: () => boolean) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/lessons/${lessonId}/transcript`, {
        cache: "no-store",
      });
      if (isCancelled()) return;
      if (!response.ok) {
        setCues([]);
        return;
      }

      const payload = await response.json();
      const content: string = payload?.data?.content ?? "";
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
    loadTranscript(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [loadTranscript]);

  const filteredCues = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) return cues;
    const needle = trimmed.toLocaleLowerCase();
    return cues.filter((cue) => cue.text.toLocaleLowerCase().includes(needle));
  }, [cues, query]);

  return {
    hasTranscript: cues.length > 0,
    cues: filteredCues,
    query,
    setQuery,
    isLoading,
  };
}
