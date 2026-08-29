"use client";

import React, { useState, useEffect, useMemo, useRef, memo } from "react";
import { safeFetch } from "@/lib/safe-client-utils";
import { logger } from "@/lib/logger";
import { AlertCircle, RefreshCw, Sword, Shield, Scroll, Trophy, Search, Swords } from "lucide-react";
import { SUBJECT_EMOJIS } from "../../shared/styles";
import type { Exam, SubjectWithExams, StatCardProps } from "../../shared/types";
import StatCard from "../../shared/StatCard";
import { DashSection, DashEmpty } from "../../shared/SectionShell";
import { DASH_GRID, DASH_BUTTON } from "../../shared/design-system";
import { SubjectCard } from "./SubjectCard";
import { ExamsModal } from "./ExamsModal";
import { SubjectCardSkeleton } from "./SubjectCardSkeleton";

type ExamsResponse = {
  exams: Exam[];
};

function isAbortError(error: unknown): boolean {
  return error instanceof Error && (
    error.name === 'AbortError' ||
    error.message.includes('signal is aborted') ||
    error.message.includes('Request was aborted') ||
    error.message.includes('Component unmounted') ||
    error.message.includes('Cancelling previous request')
  );
}

const ExamsSectionComponent = () => {
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<SubjectWithExams[]>([]);
  const [stats, setStats] = useState<StatCardProps[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<SubjectWithExams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch Logic
  useEffect(() => {
    const fetchExamsData = async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort("Cancelling previous request");
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const { data: examsData, error: examsError } = await safeFetch<ExamsResponse>(
          "/api/exams",
          { signal: controller.signal, cache: 'no-store' },
          { exams: [] }
        );

        if (examsError) {
          if (isAbortError(examsError) || controller.signal.aborted) return;
          throw new Error(examsError.message || "Failed to fetch exams");
        }

        // Backend wraps some responses in `{ success, data: {...} }`.
        // Tolerate both the wrapped and the flat shape.
        const examsSrc = (examsData as { data?: ExamsResponse } | null)?.data ?? examsData;
        const exams = Array.isArray(examsSrc?.exams) ? examsSrc.exams : [];

        if (exams.length === 0) {
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
              emoji: SUBJECT_EMOJIS[subjectName] || "⚔️",
              name: subjectName,
              exams: []
            });
          }

          const subject = subjectMap.get(subjectName);
          if (subject) {
            subject.exams.push(exam);
          }
        });

        setSubjects(Array.from(subjectMap.values()));

        const totalQuestions = exams.reduce((sum, exam) => sum + (exam.questionCount || 0), 0);
        const totalMinutes = exams.reduce((sum, exam) => sum + (exam.duration || 0), 0);

        setStats([
          { icon: <Scroll />, value: `${exams.length}`, label: "امتحان متاح", color: "primary" },
          { icon: <Sword />, value: `${totalQuestions}`, label: "سؤال", color: "primary" },
          { icon: <Trophy />, value: `${subjectMap.size}`, label: "مادة", color: "primary" },
          { icon: <Shield />, value: `${Math.round(totalMinutes / 60)}`, label: "ساعة امتحانات", color: "primary" }
        ]);

      } catch (err) {
        if (isAbortError(err) || controller.signal.aborted) return;
        logger.error("Error fetching exams data:", err);
        setError("لم نتمكن من استدعاء المهام من الخادم الرئيسي.");
      } finally {
        if (abortControllerRef.current === controller && !controller.signal.aborted) {
          setLoading(false);
        }
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
    <DashSection
      title="الامتحانات"
      subtitle="اختر المادة وابدأ الامتحان. كل امتحان تنهيه يرفع تقييمك ويكشف نقاط ضعفك."
      icon={Swords}
      toolbar={
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden="true" />
          <input
            type="text"
            placeholder="ابحث عن مادة أو امتحان…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="البحث في الامتحانات"
            className="w-full rounded-lg border border-border bg-muted/40 py-2 pr-9 pl-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      }
    >
      {/* Stats */}
      {!loading && stats.length > 0 && (
        <div className={`${DASH_GRID.stats} mb-4`}>
          {stats.map((stat, idx) => (
            <StatCard key={idx} {...stat} />
          ))}
        </div>
      )}

      {loading ? (
        <div className={DASH_GRID.tiles}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SubjectCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <DashEmpty
          icon={Search}
          title={searchTerm ? "لا توجد نتائج تطابق بحثك" : "لا توجد امتحانات متاحة حالياً"}
          description={searchTerm ? "حاول البحث باستخدام كلمات مفتاحية أخرى." : undefined}
        />
      ) : (
        <div className={DASH_GRID.tiles}>
          {filteredSubjects.map((subject) => (
            <SubjectCard key={subject.name} {...subject} onClick={() => setSelectedSubject(subject)} />
          ))}
        </div>
      )}

      {/* Error + retry */}
      {error && !loading && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-center dark:border-red-900/50 dark:bg-red-950/40">
          <AlertCircle className="h-8 w-8 text-red-500" aria-hidden="true" />
          <p className="font-bold text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => { setRetryCount((prev) => prev + 1); setError(null); }}
            className={`${DASH_BUTTON.outline} border-red-200 text-red-600 dark:border-red-900/50 dark:text-red-400`}
          >
            <RefreshCw className="h-4 w-4" /> إعادة المحاولة
          </button>
        </div>
      )}

      <ExamsModal subject={selectedSubject} onClose={() => setSelectedSubject(null)} />
    </DashSection>
  );
};

export const ExamsSection = memo(ExamsSectionComponent);
export default ExamsSection;
