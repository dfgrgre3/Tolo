"use client";

import React, { useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { AlertCircle, Sword, Clock, Target, Skull, CheckCircle2 } from "lucide-react";
import type { SubjectWithExams } from "../../shared/types";

interface ExamsModalProps {
  subject: SubjectWithExams | null;
  onClose: () => void;
}

export const ExamsModal = memo(({ subject, onClose }: ExamsModalProps) => {
  const handleEsc = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [handleEsc]);

  if (!subject) return null;

  const difficultyStyles = {
    "سهل": "bg-emerald-50 text-emerald-600 border-emerald-200",
    "متوسط": "bg-amber-50 text-amber-700 border-amber-200",
    "صعب": "bg-red-50 text-red-600 border-red-200"
  } as const;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-muted p-6 border-b border-border flex justify-between items-center shrink-0">
          <h3 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-3">
            <span className="text-3xl">{subject.emoji}</span>
            <span>امتحانات {subject.name}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground hover:bg-muted p-2 rounded-full"
            aria-label="إغلاق"
          >
            <AlertCircle className="w-6 h-6 rotate-45" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {subject.exams.length > 0 ? (
            subject.exams.map((exam) => (
              <div key={exam.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted p-4 hover:border-primary/30 hover:bg-muted/70">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                  <div>
                    <h4 className="font-bold text-lg text-foreground group-hover:text-primary-strong flex items-center gap-2">
                      {exam.title}
                      {exam.difficulty === 'صعب' && <Skull className="w-4 h-4 text-red-500" />}
                      {exam.isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1 bg-card px-2 py-1 rounded border border-border"><Clock className="w-3 h-3" /> {exam.duration} دقيقة</span>
                      <span className="flex items-center gap-1 bg-card px-2 py-1 rounded border border-border"><Target className="w-3 h-3" /> {exam.questionCount} سؤال</span>
                      <span className={`px-2 py-1 rounded border ${difficultyStyles[exam.difficulty] || ''}`}>{exam.difficulty}</span>
                    </div>
                  </div>
                  <Link
                    href={`/exams/${exam.id}`}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-bold w-full sm:w-auto text-center flex items-center justify-center gap-2"
                  >
                    <Sword className="w-4 h-4" />
                    <span>ابدأ الامتحان</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <Sword className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد امتحانات متاحة حالياً في هذه المادة.</p>
              <p className="text-sm opacity-60 mt-2">عد لاحقاً لمزيد من الامتحانات.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ExamsModal.displayName = "ExamsModal";

export default ExamsModal;
