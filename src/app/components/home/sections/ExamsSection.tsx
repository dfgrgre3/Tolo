"use client";

import React, { useState, useEffect, useMemo, useRef, memo, useCallback } from "react";
import Link from "next/link";
import { m } from "framer-motion";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from '@/lib/logger';
import { AlertCircle, RefreshCw, Sword, Shield, Scroll, Trophy, Skull, Target, Clock, Swords, CheckCircle2 } from "lucide-react";
import { rpgCommonStyles, SUBJECT_EMOJIS } from "../constants";
import type { Exam, SubjectWithExams } from "../types";
import StatCard from "../StatCard";

type ExamsResponse = {
  exams: Exam[];
};

// --- Skeleton Components ---
const SubjectCardSkeleton = () =>
<div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center animate-pulse h-[180px] w-full" />;


// --- Presentational Components ---
const SubjectCard = memo(({ emoji, name, onClick }: {emoji: string;name: string;onClick: () => void;}) =>
<m.button
  onClick={onClick}
  whileHover={{ y: -8, scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
  className={`${rpgCommonStyles.card} group w-full flex flex-col items-center justify-center gap-5 hover:border-red-500/40 hover:bg-black/40 transition-all duration-500 transform min-h-[180px] relative overflow-hidden backdrop-blur-2xl p-6`}
  aria-label={`تحدي مادة ${name}`}>
  
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="text-6xl drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] group-hover:scale-125 transition-transform duration-500 filter group-hover:brightness-125 relative z-10" role="img" aria-hidden="true">{emoji}</div>
        <div className="text-xl font-black text-gray-100 group-hover:text-red-400 transition-colors tracking-tight relative z-10">{name}</div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500/0 group-hover:text-red-500/100 transition-all duration-500 mt-1 relative z-10">بداية المعركة</div>
    </m.button>
);
SubjectCard.displayName = "SubjectCard";

// --- Modal Component ---
const ExamsModal = memo(({ subject, onClose }: {subject: SubjectWithExams | null;onClose: () => void;}) => {
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
      aria-modal="true">
      
            <div
        className="bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        
                {/* Header */}
                <div className="bg-[#1e293b]/50 p-6 border-b border-white/10 flex justify-between items-center shrink-0">
                    <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-3">
                        <span className="text-3xl filter drop-shadow-md">{subject.emoji}</span>
                        <span>معارك {subject.name}</span>
                    </h3>
                    <button
            onClick={onClose}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
            aria-label="إغلاق">
            
                        <AlertCircle className="w-6 h-6 rotate-45" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {subject.exams.length > 0 ?
          subject.exams.map((exam) =>
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
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-lg font-bold shadow-[0_0_15px_rgba(124,58,237,0.3)] hover:shadow-[0_0_25px_rgba(124,58,237,0.5)] transition-all duration-300 w-full sm:w-auto text-center flex items-center justify-center gap-2">
                
                                    <Sword className="w-4 h-4" />
                                    <span>بدء القتال</span>
                                </Link>
                            </div>
                        </div>
          ) :

          <div className="text-center py-12 text-gray-500 flex flex-col items-center">
                            <Scroll className="w-16 h-16 mb-4 opacity-20" />
                            <p className="text-lg font-medium">لا توجد مهام متاحة حالياً في هذه المنطقة.</p>
                            <p className="text-sm opacity-60 mt-2">عد لاحقاً، القادة يخططون لمعارك جديدة.</p>
                        </div>
          }
                </div>
            </div>
        </div>);

});
ExamsModal.displayName = "ExamsModal";

// --- Main Component ---
const ExamsSectionComponent = () => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithExams[]>([]);
  const [stats, setStats] = useState<{icon: React.ReactNode;value: string;label: string;color: string;}[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithExams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch Logic
  useEffect(() => {
    const fetchExamsData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort("Cancelling previous request");
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);

      try {
        // TODO: Replace with actual stricter typed response if available
        const { data: examsData, error: examsError } = await safeFetch<ExamsResponse>(
          "/api/exams",
          { signal: abortControllerRef.current.signal, cache: 'no-store' },
          { exams: [] }
        );

        if (examsError) {
          if (examsError instanceof Error && examsError.name === 'AbortError') return;
          throw new Error(examsError.message || "Failed to fetch exams");
        }

        const exams = Array.isArray(examsData?.exams) ? examsData.exams : [];

        if (exams.length === 0) {
          // Empty state handling or throw error
          setSubjects([]);
          setStats([]);
          return;
        }

        const subjectMap = new Map<string, SubjectWithExams>();

        exams.forEach((exam: Exam) => {
          const subjectName = exam.subject || "عام";
          if (!subjectMap.has(subjectName)) {
            subjectMap.set(subjectName, {
              id: subjectName,
              emoji: SUBJECT_EMOJIS[subjectName] || "âڑ”ï¸ڈ",
              name: subjectName,
              exams: []
            });
          }

          const subject = subjectMap.get(subjectName);
          if (subject) {
            subject.exams.push({
              ...exam,
              title: exam.title || "تحدي مجهول",
              duration: exam.duration || 60,
              questionCount: exam.questionCount || 10,
              difficulty: exam.difficulty || "متوسط"
            });
          }
        });

        setSubjects(Array.from(subjectMap.values()));

        const totalExams = exams.length;
        const totalQuestions = exams.reduce((sum, exam) => sum + (exam.questionCount || 0), 0);

        setStats([
        { icon: <Scroll />, value: `${totalExams}+`, label: "مهمة متاحة", color: "from-blue-500 to-cyan-500" },
        { icon: <Trophy />, value: `2000+`, label: "بطل مشارك", color: "from-amber-400 to-orange-500" },
        { icon: <Sword />, value: `${totalQuestions}+`, label: "تحدي (سؤال)", color: "from-red-500 to-rose-600" }]
        );

      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        logger.error("Error fetching exams data:", err);
        setError("لم نتمكن من استدعاء المهام من الخادم الرئيسي.");
      } finally {
        setLoading(false);
      }
    };

    fetchExamsData();
    return () => {if (abortControllerRef.current) abortControllerRef.current.abort("Component unmounted");};
  }, [retryCount]);

  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjects;
    const searchLower = searchTerm.toLowerCase().trim();
    return subjects.filter((subject) =>
    subject.name.toLowerCase().includes(searchLower) ||
    subject.exams.some((exam) => exam.title.toLowerCase().includes(searchLower))
    );
  }, [subjects, searchTerm]);

  return (
    <section className={`${rpgCommonStyles.glassPanel} px-4 py-12 !mt-12 overflow-hidden`}>
             <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 pointer-events-none mix-blend-overlay"></div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-16 relative">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-red-600/10 rounded-full blur-[100px] -z-10" />
                    <m.div
            initial={{ scale: 0.8, rotate: -10 }}
            whileInView={{ scale: 1, rotate: 0 }}
            className="inline-flex items-center justify-center p-5 mb-8 rounded-[2rem] bg-black/60 border-2 border-red-500/40 backdrop-blur-2xl shadow-[0_0_40px_rgba(239,68,68,0.3)] ring-1 ring-white/10">
            
                        <Swords className="w-12 h-12 text-red-500 filter drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    </m.div>
                    <h2 id="exams-heading" className={`text-5xl md:text-7xl font-black mb-6 tracking-tighter ${rpgCommonStyles.goldText}`}>
                         ساحة المعارك (ARENA)
                    </h2>
                    <p className="text-gray-400 mb-8 max-w-3xl mx-auto text-xl font-medium border-x-2 border-red-500/20 px-8 leading-relaxed">
                        اختر سلاحك (المادة) واستعد لمواجهة التحديات. كل انتصار يقربك من نيل رتبة "البطل الأسطوري".
                    </p>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto px-4">
                    {loading ? Array.from({ length: 3 }).map((_, i) =>
          <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
          ) : stats.map((stat, idx) =>
          <StatCard
            key={idx}
            {...stat}
            color={stat.color}
            delay={idx * 0.1} />

          )}
                </div>

                {/* Main Content Area */}
                <div className="rounded-3xl border border-white/10 bg-black/20 backdrop-blur-md p-6 md:p-10 shadow-2xl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10 border-b border-white/5 pb-8">
                        <div className="text-center md:text-right w-full md:w-auto">
                            <p className="font-bold text-2xl text-gray-100 mb-2">اختر منطقة المعركة</p>
                            <p className="text-sm text-gray-400">حدد المادة لبدء المهام المتاحة</p>
                        </div>
                        <div className="relative w-full md:w-96 group">
                            <input
                type="text"
                placeholder="ًں”چ ابحث عن تحدي أو مادة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-5 py-4 rounded-xl bg-black/40 border border-white/10 text-white placeholder:text-gray-500 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:outline-none transition-all pl-12 shadow-inner text-lg" />
              
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none -z-10 blur-xl"></div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                        {loading ? Array(5).fill(0).map((_, i) => <SubjectCardSkeleton key={i} />) :
            filteredSubjects.map((subject) =>
            <SubjectCard key={subject.name} {...subject} onClick={() => setSelectedSubject(subject)} />
            )
            }
                    </div>
                    
                    {error &&
          <div className="text-center py-8 mx-auto max-w-md mt-8 animate-in fade-in">
                            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 flex flex-col items-center gap-4">
                                <AlertCircle className="h-10 w-10 text-red-400" />
                                <p className="font-medium text-red-100 text-lg">{error}</p>
                                <button
                onClick={() => {setRetryCount((prev) => prev + 1);setError(null);}}
                className="mt-2 text-sm bg-red-500/20 hover:bg-red-500/30 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 border border-red-500/30">
                
                                    <RefreshCw className="w-4 h-4" /> إعادة الاتصال
                                </button>
                            </div>
                        </div>
          }
                    
                    {!loading && !error && filteredSubjects.length === 0 &&
          <div className="text-center py-20 text-gray-500 col-span-full">
                            <Shield className="w-20 h-20 mx-auto mb-6 opacity-20" />
                            <p className="text-xl font-medium">لا توجد ساحات معركة تطابق بحثك.</p>
                            <p className="text-sm mt-2 opacity-60">حاول البحث باستخدام كلمات مفتاحية أخرى.</p>
                        </div>
          }
                </div>
            </div>
            
            <ExamsModal subject={selectedSubject} onClose={() => setSelectedSubject(null)} />
        </section>);

};

export const ExamsSection = memo(ExamsSectionComponent);
export default ExamsSection;