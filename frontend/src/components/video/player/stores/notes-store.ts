/**
 * Notes Store - Timeline notes management
 * @module video/player/stores/notes-store
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { TimelineNote } from "../types";

interface NotesState {
  notes: TimelineNote[];
  noteDraft: string;
  isNotesSyncing: boolean;
}

interface NotesActions {
  setNotesState: (partial: Partial<NotesState> | ((state: NotesState) => Partial<NotesState>)) => void;
  resetNotesState: (partial?: Partial<NotesState>) => void;
  setNotes: (notes: TimelineNote[]) => void;
  addNote: (note: TimelineNote) => void;
  removeNote: (noteId: string) => void;
  setNoteDraft: (draft: string) => void;
  setNotesSyncing: (isSyncing: boolean) => void;
  updateNote: (noteId: string, updates: Partial<TimelineNote>) => void;
}

export type NotesStore = NotesState & NotesActions;

const createDefaultNotesState = (): NotesState => ({
  notes: [],
  noteDraft: "",
  isNotesSyncing: false,
});

export const useNotesStore = create<NotesStore>()(
  subscribeWithSelector((set) => ({
    ...createDefaultNotesState(),

    setNotesState: (partial) =>
      set((state) => ({
        ...(typeof partial === "function" ? partial(state) : partial),
      })),

    resetNotesState: (partial) =>
      set(() => ({
        ...createDefaultNotesState(),
        ...partial,
      })),

    setNotes: (notes) => set({ notes }),

    addNote: (note) =>
      set((state) => ({
        notes: [...state.notes, note],
      })),

    removeNote: (noteId) =>
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== noteId),
      })),

    setNoteDraft: (noteDraft) => set({ noteDraft }),
    setNotesSyncing: (isNotesSyncing) => set({ isNotesSyncing }),

    updateNote: (noteId, updates) =>
      set((state) => ({
        notes: state.notes.map((n) =>
          n.id === noteId ? { ...n, ...updates } : n
        ),
      })),
  }))
);
