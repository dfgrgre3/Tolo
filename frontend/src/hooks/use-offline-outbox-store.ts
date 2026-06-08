import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface PendingSubmission {
  id: string;
  userId: string;
  examId: string;
  score: number;
  takenAt?: string;
  timestamp: number;
}

interface OfflineOutboxState {
  pendingSubmissions: PendingSubmission[];
  addSubmission: (submission: Omit<PendingSubmission, 'id' | 'timestamp'>) => void;
  removeSubmission: (id: string) => void;
  clearOutbox: () => void;
}

export const useOfflineOutboxStore = create<OfflineOutboxState>()(
  persist(
    (set) => ({
      pendingSubmissions: [],
      addSubmission: (sub) => {
        const newSub: PendingSubmission = {
          ...sub,
          id: `exam_sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          pendingSubmissions: [...state.pendingSubmissions, newSub],
        }));
      },
      removeSubmission: (id) => {
        set((state) => ({
          pendingSubmissions: state.pendingSubmissions.filter((x) => x.id !== id),
        }));
      },
      clearOutbox: () => set({ pendingSubmissions: [] }),
    }),
    {
      name: 'offline-exams-outbox',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} })),
    }
  )
);
