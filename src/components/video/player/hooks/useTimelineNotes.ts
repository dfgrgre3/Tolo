import { useState, useCallback, useEffect } from "react";
import { Clock3 } from "lucide-react";
import { useCourseVideoPlayerStore } from "../store";
import {
  createTimelineNote,
  parseCloudTimelineNotes,
  serializeCloudTimelineNotes,
} from "../utils";
import type { PlayerFeedback, TimelineNote } from "../types";

type TimelineNotesOptions = {
  lessonId: string;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
};

export function useTimelineNotes({
  lessonId,
  flashFeedback,
}: TimelineNotesOptions) {
  const { setPlayerState, currentTime } = useCourseVideoPlayerStore();
  const [notes, setNotes] = useState<TimelineNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [notesFreeformContent, setNotesFreeformContent] = useState("");
  const [isNotesSyncing, setIsNotesSyncing] = useState(false);

  const persistCloudNotes = useCallback(
    async (nextNotes: TimelineNote[], freeformContent = notesFreeformContent) => {
      try {
        setIsNotesSyncing(true);
        const content = serializeCloudTimelineNotes(freeformContent, nextNotes);
        const response = await fetch(`/api/courses/lessons/${lessonId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        if (!response.ok) {
          throw new Error("Failed to save notes.");
        }
      } catch {
        setPlayerState({
          errorMessage: "تعذر مزامنة الملاحظات السحابية لهذا الدرس.",
        });
      } finally {
        setIsNotesSyncing(false);
      }
    },
    [lessonId, notesFreeformContent, setPlayerState]
  );

  const loadCloudNotes = useCallback(async () => {
    let isCancelled = false;
    setIsNotesSyncing(true);
    try {
      const response = await fetch(`/api/courses/lessons/${lessonId}/notes`, {
        cache: "no-store",
      });
      if (!response.ok) return;

      const payload = await response.json();
      const content = payload?.data?.content ?? "";
      const parsed = parseCloudTimelineNotes(content);
      
      setNotes(parsed.notes);
      setNotesFreeformContent(parsed.freeformContent);
    } catch {
      setNotes([]);
      setNotesFreeformContent("");
    } finally {
      setIsNotesSyncing(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void loadCloudNotes();
  }, [loadCloudNotes]);

  const addNoteAtCurrentTime = useCallback(() => {
    const text = noteDraft.trim();
    if (!text) return;

    const nextNote = createTimelineNote(currentTime, text);
    const nextNotes = [...notes, nextNote].sort((left, right) => left.time - right.time);
    
    setNotes(nextNotes);
    void persistCloudNotes(nextNotes);
    
    setNoteDraft("");
    setPlayerState({ sidebarTab: "notes", isSidebarOpen: true });
    flashFeedback({ icon: Clock3, label: "تمت إضافة الملاحظة" });
  }, [currentTime, flashFeedback, noteDraft, notes, persistCloudNotes, setPlayerState]);

  const removeNote = useCallback(
    (noteId: string) => {
      const nextNotes = notes.filter((note) => note.id !== noteId);
      setNotes(nextNotes);
      void persistCloudNotes(nextNotes);
    },
    [notes, persistCloudNotes]
  );

  return {
    notes,
    noteDraft,
    setNoteDraft,
    isNotesSyncing,
    addNoteAtCurrentTime,
    removeNote,
    setNotes,
    setNotesFreeformContent,
  };
}
