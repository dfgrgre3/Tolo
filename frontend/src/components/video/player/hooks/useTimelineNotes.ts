import { useState, useCallback, useEffect, useRef } from "react";
import { Clock3 } from "lucide-react";
import { usePlayerPlayback, usePlayerUI } from "../stores/player-scope";
import {
  createTimelineNote,
  parseCloudTimelineNotes,
  serializeCloudTimelineNotes,
} from "../utils";
import type { PlayerFeedback, TimelineNote } from "../types";
import { apiRoutes } from "@/lib/api/routes";
import {
  offlineMutationQueue,
  newClientOpId,
} from "@/lib/sync/offline-queue";
import {
  getLessonNoteItems,
  getLessonNotes,
  saveLessonNotes,
  type NoteItemPayload,
} from "@/services/api/lesson-content-service";

type TimelineNotesOptions = {
  lessonId: string;
  flashFeedback: (feedback: NonNullable<PlayerFeedback>) => void;
};

const byTime = (left: TimelineNote, right: TimelineNote) =>
  left.time - right.time || (left.createdAt ?? 0) - (right.createdAt ?? 0);

/**
 * Timeline notes (P1-24 / P1-25 / P1-26).
 *
 * Primary path — per-note item endpoints with an ordered, durable mutation
 * queue: optimistic apply + sequential enqueue (create → edit → delete stay
 * in causal order), each mutation carrying its clientOpId as the
 * Idempotency-Key, so offline/retry/reconnect converge instead of
 * last-write-wins data loss.
 *
 * Fallback path — the legacy whole-blob endpoints, used only when the items
 * API is unavailable (backend predates migration 0217). Detected once per
 * lesson via the list call.
 */
export function useTimelineNotes({
  lessonId,
  flashFeedback,
}: TimelineNotesOptions) {
  const currentTime = usePlayerPlayback((s) => s.currentTime);
  const setUIState = usePlayerUI((s) => s.setUIState);
  const [notes, setNotes] = useState<TimelineNote[]>([]);
  const [noteDraft, setNoteDraft] = useState("");
  const [useLegacyBlob, setUseLegacyBlob] = useState(false);
  const [notesFreeformContent, setNotesFreeformContent] = useState("");
  const [isNotesSyncing, setIsNotesSyncing] = useState(false);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  // Syncing = initial load OR any queued note mutation for this lesson.
  const refreshSyncFlag = useCallback(() => {
    const pending = offlineMutationQueue
      .pendingByKind("note")
      .filter((m) => m.endpoint.includes(`/lessons/${lessonId}/`)).length;
    setIsNotesSyncing(pending > 0);
  }, [lessonId]);

  useEffect(() => {
    refreshSyncFlag();
    return offlineMutationQueue.subscribe(refreshSyncFlag);
  }, [refreshSyncFlag]);

  const loadCloudNotes = useCallback(
    async (isCancelled: () => boolean) => {
      setIsNotesSyncing(true);
      // Preferred: per-note items.
      try {
        const payload = await getLessonNoteItems(lessonId);
        if (isCancelled()) return;
        setUseLegacyBlob(false);
        setNotes(
          (payload?.notes ?? []).map((n) => ({
            id: n.id,
            clientId: n.clientId,
            time: n.time,
            text: n.text,
            createdAt: n.createdAt ? new Date(n.createdAt).getTime() : undefined,
          }))
        );
      } catch (err) {
        if (isCancelled()) return;
        if (!isLegacyMissing(err)) {
          // Items API exists but failed (offline, 5xx): keep local state;
          // queued mutations + the next load will converge.
          if (!isCancelled()) refreshSyncFlag();
          return;
        }
        // Legacy backend: whole-blob protocol.
        setUseLegacyBlob(true);
        try {
          const payload = await getLessonNotes(lessonId);
          if (isCancelled()) return;
          const parsed = parseCloudTimelineNotes(payload?.content ?? "");
          if (isCancelled()) return;
          setNotes(parsed.notes.filter((n): n is TimelineNote => n !== null));
          setNotesFreeformContent(parsed.freeformContent);
        } catch {
          if (isCancelled()) return;
          setNotes([]);
          setNotesFreeformContent("");
        }
      } finally {
        if (!isCancelled()) refreshSyncFlag();
      }
    },
    [lessonId, refreshSyncFlag]
  );

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      loadCloudNotes(() => cancelled);
    });
    return () => {
      cancelled = true;
    };
  }, [loadCloudNotes]);

  // ── Legacy whole-blob persist (fallback only) ──
  const persistLegacyNotes = useCallback(
    async (nextNotes: TimelineNote[]) => {
      try {
        setIsNotesSyncing(true);
        const content = serializeCloudTimelineNotes(notesFreeformContent, nextNotes);
        await saveLessonNotes(lessonId, content);
      } catch {
        setUIState({
          errorMessage: "تعذر مزامنة الملاحظات السحابية لهذا الدرس.",
        });
      } finally {
        setIsNotesSyncing(false);
      }
    },
    [lessonId, notesFreeformContent, setUIState]
  );

  // ── Items path: optimistic + ordered queue (P1-25) ──
  const reconcileCreated = useCallback((clientId: string, response: unknown) => {
    const saved = (response as { data?: NoteItemPayload } | null)?.data;
    setNotes((prev) =>
      prev.map((n) =>
        n.clientId === clientId
          ? {
              ...n,
              id: saved?.id ?? n.id,
              time: saved?.time ?? n.time,
              text: saved?.text ?? n.text,
              pending: false,
            }
          : n
      )
    );
  }, []);

  const addNoteAtCurrentTime = useCallback(() => {
    const text = noteDraft.trim();
    if (!text) return;

    if (useLegacyBlob) {
      const nextNote = createTimelineNote(currentTime, text);
      const nextNotes = [...notesRef.current, nextNote].sort(byTime);
      setNotes(nextNotes);
      void persistLegacyNotes(nextNotes);
      setNoteDraft("");
      setUIState({ sidebarTab: "notes", isSidebarOpen: true });
      flashFeedback({ icon: Clock3, label: "تمت إضافة الملاحظة" });
      return;
    }

    const clientId = newClientOpId("note");
    const optimistic: TimelineNote = {
      id: `local:${clientId}`,
      clientId,
      time: Math.max(0, Math.floor(currentTime)),
      text,
      createdAt: Date.now(),
      pending: true,
    };
    setNotes((prev) => [...prev, optimistic].sort(byTime));
    offlineMutationQueue.enqueue({
      id: `note-create:${clientId}`,
      kind: "note",
      method: "POST",
      endpoint: apiRoutes.courses.lessonNoteItems(lessonId),
      body: { clientId, time: optimistic.time, text },
      idempotencyKey: clientId,
      onSettled: (ok, response) => {
        if (ok) {
          reconcileCreated(clientId, response);
        } else {
          // Permanent failure: keep the optimistic row but surface it.
          setUIState({
            errorMessage: "تعذر حفظ الملاحظة. ستُعاد المحاولة تلقائيًا.",
          });
        }
      },
    });
    setNoteDraft("");
    setUIState({ sidebarTab: "notes", isSidebarOpen: true });
    flashFeedback({ icon: Clock3, label: "تمت إضافة الملاحظة" });
  }, [currentTime, flashFeedback, lessonId, noteDraft, persistLegacyNotes, reconcileCreated, setUIState, useLegacyBlob]);

  const removeNote = useCallback(
    (noteId: string) => {
      const target = notesRef.current.find((n) => n.id === noteId);
      if (!target) return;

      if (useLegacyBlob || !target.clientId) {
        const nextNotes = notesRef.current.filter((note) => note.id !== noteId);
        setNotes(nextNotes);
        if (useLegacyBlob) void persistLegacyNotes(nextNotes);
        return;
      }

      // Optimistic delete.
      setNotes((prev) => prev.filter((note) => note.id !== noteId));

      if (target.pending) {
        // Never reached the server: drop the queued create instead of
        // sending a delete for a row that doesn't exist.
        offlineMutationQueue.remove(`note-create:${target.clientId}`);
        return;
      }

      offlineMutationQueue.enqueue({
        id: `note-delete:${target.clientId}`,
        kind: "note",
        method: "DELETE",
        endpoint: apiRoutes.courses.lessonNoteItem(lessonId, target.id),
        idempotencyKey: `delete:${target.clientId}`,
      });
    },
    [lessonId, persistLegacyNotes, useLegacyBlob]
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

/** 404 from the items list = backend predates migration 0217 → blob fallback. */
function isLegacyMissing(err: unknown): boolean {
  return (
    !!err &&
    typeof err === "object" &&
    "status" in err &&
    (err as { status: unknown }).status === 404
  );
}
