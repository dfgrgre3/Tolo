"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Search, User, Star, BookOpen, Zap, ExternalLink, Loader2, Youtube, RotateCcw } from "lucide-react";

import { logger } from "@/lib/logger";
import { useAIWorkspace } from "../context/AIWorkspaceContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AISectionShell,
  AIError,
  AIEmptyState,
  HistoryBar,
  FieldLabel,
  loadLocal,
  saveLocal,
} from "./ai-shared";

interface Teacher {
  name: string;
  subject: string;
  url?: string;
  description?: string;
  rating?: number;
  thumbnail?: string;
}

interface TeacherSearchProps {
  subjects: string[];
  platforms?: string[];
  className?: string;
}

type TeacherResults = { localTeachers: Teacher[]; aiTeachers: Teacher[]; youtubeResults: Teacher[] };

const HISTORY_KEY = "thanawy:ai:teacher-history";

function validateAndFormatTeachers(data: unknown): TeacherResults {
  if (!data || typeof data !== "object") throw new Error("بيانات غير صالحة من الخادم");
  const record = data as Record<string, unknown>;
  return {
    localTeachers: Array.isArray(record.localTeachers) ? (record.localTeachers as Teacher[]) : [],
    aiTeachers: Array.isArray(record.aiTeachers) ? (record.aiTeachers as Teacher[]) : [],
    youtubeResults: Array.isArray(record.youtubeResults) ? (record.youtubeResults as Teacher[]) : [],
  };
}

export default function TeacherSearch({
  subjects,
  platforms = ["يوتيوب", "منصة دروس", "منصة مدرستي", "أخرى"],
  className = "",
}: TeacherSearchProps) {
  const { teachers: searchTeachers, context, setContext } = useAIWorkspace();
  const [selectedSubject, setSelectedSubject] = useState(context.subject ?? "");
  const [keywords, setKeywords] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [teachers, setTeachers] = useState<TeacherResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    setHistory(loadLocal<string[]>(HISTORY_KEY, []));
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedSubject) {
      setError("الرجاء اختيار المادة أولاً");
      return;
    }
    setIsSearching(true);
    setError(null);
    setTeachers(null);
    try {
      setContext({ subject: selectedSubject });
      const rawData = await searchTeachers<unknown>({
        subject: selectedSubject,
        keywords: keywords || undefined,
        platform: selectedPlatform || undefined,
      });
      setTeachers(validateAndFormatTeachers(rawData));
      const label = `${selectedSubject}${keywords ? ` • ${keywords}` : ""}`;
      setHistory((prev) => {
        const next = [label, ...prev.filter((h) => h !== label)].slice(0, 8);
        saveLocal(HISTORY_KEY, next);
        return next;
      });
    } catch (err) {
      logger.error("Error searching teachers:", err);
      const msg = err instanceof Error ? err.message : "حدث خطأ غير معروف";
      if (msg.includes("API key") || msg.includes("مفتاح API")) {
        setError("خدمة البحث غير مهيأة حالياً. تواصل مع الدعم.");
      } else if (msg.includes("fetch")) {
        setError("تعذّر الاتصال. تحقق من الإنترنت وحاول مجدداً.");
      } else {
        setError(msg);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const renderStars = (rating?: number) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`h-3.5 w-3.5 ${i < Math.floor(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        ))}
        <span className="ms-1 text-xs text-muted-foreground">{rating.toFixed(1)}</span>
      </div>
    );
  };

  const renderTeacherCard = (teacher: Teacher, source: string) => (
    <Card key={`${teacher.name}-${source}-${teacher.url ?? ""}`} className="rounded-2xl p-5 transition hover:border-primary/40">
      <div className="flex items-start gap-4">
        {teacher.thumbnail ? (
          <Image src={teacher.thumbnail} alt={teacher.name} width={64} height={64} unoptimized className="h-16 w-16 shrink-0 rounded-2xl border border-border object-cover" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
            <User className="h-7 w-7" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-bold text-foreground">{teacher.name}</h3>
            {teacher.url && (
              <a href={teacher.url} target="_blank" rel="noopener noreferrer" className="rounded-lg p-2 text-primary hover:bg-primary/10" aria-label={`فتح ${teacher.name}`}>
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="rounded-full text-[11px]">
              <BookOpen className="h-3 w-3 me-1" /> {teacher.subject}
            </Badge>
            {source === "youtube" && (
              <Badge className="rounded-full border-red-500/30 bg-red-500/10 text-red-500 text-[11px]">
                <Youtube className="h-3 w-3 me-1" /> يوتيوب
              </Badge>
            )}
            {source === "ai" && (
              <Badge className="rounded-full border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px]">
                <Zap className="h-3 w-3 me-1" /> ترشيح ذكي
              </Badge>
            )}
          </div>
          {teacher.description && <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{teacher.description}</p>}
          <div className="mt-2">{renderStars(teacher.rating)}</div>
        </div>
      </div>
    </Card>
  );

  const totalCount = (teachers?.localTeachers.length ?? 0) + (teachers?.aiTeachers.length ?? 0) + (teachers?.youtubeResults.length ?? 0);

  return (
    <AISectionShell
      badge="Teacher Finder"
      title="البحث عن المعلمين"
      description="اعثر على أفضل المعلمين وقنوات الشرح حسب مادتك — من منصتنا ومن ترشيحات الذكاء الاصطناعي ويوتيوب."
      icon={<Search className="h-6 w-6" />}
    >
      <div className={className}>
        <HistoryBar
          items={history}
          onClear={() => {
            setHistory([]);
            saveLocal(HISTORY_KEY, []);
          }}
          onSelect={(h) => {
            const [subj] = h.split(" • ");
            if (subj) setSelectedSubject(subj);
          }}
          renderLabel={(h) => h}
        />

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <FieldLabel required>المادة</FieldLabel>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="اختر المادة" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>كلمات مفتاحية</FieldLabel>
            <Input value={keywords} onChange={(e) => setKeywords(e.target.value.slice(0, 100))} placeholder="مثال: مراجعة نهائية، ثانوية عامة..." className="h-12 rounded-xl" />
          </div>
          <div>
            <FieldLabel>المنصة</FieldLabel>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="h-12 rounded-xl">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent>
                {platforms.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-3 md:col-span-3">
            <Button type="submit" disabled={isSearching || !selectedSubject} className="h-12 rounded-xl px-10 font-bold">
              {isSearching ? (
                <>
                  <Loader2 className="h-5 w-5 me-2 animate-spin" /> جاري البحث...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5 me-2" /> بحث عن معلمين
                </>
              )}
            </Button>
            {selectedPlatform && (
              <Button type="button" variant="ghost" className="h-12 rounded-xl" onClick={() => setSelectedPlatform("")}>
                مسح فلتر المنصة
              </Button>
            )}
          </div>
        </form>

        <div className="mt-4">
          <AIError message={error} onRetry={() => handleSubmit()} />
        </div>

        <div className="mt-6">
          {!teachers ? (
            !isSearching && (
              <AIEmptyState icon={<Search className="h-6 w-6" />} title="ابدأ البحث" description="اختر المادة واضغط بحث لعرض معلمي المنصة والترشيحات الذكية وقنوات يوتيوب في مكان واحد." />
            )
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-foreground">نتائج البحث ({totalCount})</h3>
                <Button onClick={() => { setTeachers(null); setError(null); }} variant="outline" size="sm" className="rounded-xl">
                  <RotateCcw className="h-3.5 w-3.5 me-1.5" /> بحث جديد
                </Button>
              </div>
              {teachers.localTeachers.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">معلمو المنصة ({teachers.localTeachers.length})</h4>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {teachers.localTeachers.map((t) => renderTeacherCard(t, "local"))}
                  </div>
                </section>
              )}
              {teachers.aiTeachers.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">ترشيحات ذكية ({teachers.aiTeachers.length})</h4>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {teachers.aiTeachers.map((t) => renderTeacherCard(t, "ai"))}
                  </div>
                </section>
              )}
              {teachers.youtubeResults.length > 0 && (
                <section>
                  <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">قنوات يوتيوب ({teachers.youtubeResults.length})</h4>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {teachers.youtubeResults.map((t) => renderTeacherCard(t, "youtube"))}
                  </div>
                </section>
              )}
              {totalCount === 0 && (
                <AIEmptyState icon={<User className="h-6 w-6" />} title="لا توجد نتائج" description="جرّب كلمات مفتاحية مختلفة أو أزل فلتر المنصة." />
              )}
            </div>
          )}
        </div>
      </div>
    </AISectionShell>
  );
}
