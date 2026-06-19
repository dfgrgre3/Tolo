"use client";

import React, { useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { AlertCircle, Sword, Clock, Target, Skull, CheckCircle2 } from "lucide-react";
import type { SubjectWithExams } from "../../types";

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
    "سهل": "bg-green-500/10 text-green-400 border-green-500/20",
    "متوسط": "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    "صعب": "bg-red-500/10 text-red-400 border-red-500/20"
  } as const;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1e293b]/50 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
          <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl filter drop-shadow-md">{subject.emoji}</span>
            <span>معارك {subject.name}</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="إغلاق"
          >
            <AlertCircle className="w-6 h-6 rotate-45" />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {subject.exams.length > 0 ? (
            subject.exams.map((exam) => (
              <div key={exam.id} className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-4 transition-all hover:border-primary/30 hover:bg-white/10 hover:shadow-lg hover:shadow-primary/5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                  <div>
                    <h4 className="font-bold text-lg text-gray-100 group-hover:text-primary transition-colors flex items-center gap-2">
                      {exam.title}
                      {exam.difficulty === 'صعب' && <Skull className="w-4 h-4 text-red-500 animate-pulse" />}
                      {exam.isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    </h4>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-2">
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Clock className="w-3 h-3" /> {exam.duration} دقيقة</span>
                      <span className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded"><Target className="w-3 h-3" /> {exam.questionCount} سؤال</span>
                      <span className={`px-2 py-1 rounded border ${difficultyStyles[exam.difficulty] || ''}`}>{exam.difficulty}</span>
                    </div>
                  </div>
                  <Link
                    href={`/exams/${exam.id}`}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 w-full sm:w-auto text-center flex items-center justify-center gap-2"
                  >
                    <Sword className="w-4 h-4" />
                    <span>بدء القتال</span>
                  </Link>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-gray-500 flex flex-col items-center">
              <Sword className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">لا توجد مهام متاحة حالياً في هذه المنطقة.</p>
              <p className="text-sm opacity-60 mt-2">عد لاحقاً، القادة يخططون لمعارك جديدة.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ExamsModal.displayName = "ExamsModal";

export default ExamsModal;
