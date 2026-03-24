"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ensureUser } from "@/lib/user-utils";
import { safeFetch } from "@/lib/safe-client-utils";

import { motion, AnimatePresence } from "framer-motion";
import {

  Sword,
  Trash2,
  BookOpen,
  Award,
  Calendar,

  Flame,
  Target,


  ExternalLink,

  Scroll } from


"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Exam {
  id: string;
  subject: string;
  title: string;
  year: number;
  url: string;
  type?: string;
}

interface ExamsResponse {
  exams: Exam[];
}

interface ExamResult {
  id: string;
  score: number;
  takenAt: string;
  exam: Exam;
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all hover:scale-[1.01]",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function ExamsPage() {
  const search = useSearchParams();
  const _focusId = search.get("focus");
  const [userId, setUserId] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [examId, setExamId] = useState("");
  const [score, setScore] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [,,] = useState<string | null>(null);

  useEffect(() => {
    ensureUser().then(setUserId);
  }, []);

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true);
      try {
        const { data } = await safeFetch<ExamsResponse>("/api/exams", undefined, { exams: [] });
        setExams(Array.isArray(data?.exams) ? data.exams : []);
      } finally {setIsLoading(false);}
    };
    fetchExams();
  }, []);

  useEffect(() => {
    if (!userId) return;
    const fetchResults = async () => {
      const { data } = await safeFetch<ExamResult[]>(`/api/exams/results?userId=${userId}`, undefined, []);
      if (data) setResults(data);
    };
    fetchResults();
  }, [userId]);

  const addResult = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !examId) return;
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum)) return;

    setIsSubmitting(true);
    try {
      const { data } = await safeFetch<ExamResult>("/api/exams/results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, examId, score: scoreNum, takenAt: takenAt || undefined })
      }, null);
      if (data) {
        setResults((r) => [data, ...r]);
        setExamId("");setScore("");setTakenAt("");
      }
    } finally {setIsSubmitting(false);}
  }, [userId, examId, score, takenAt]);

  const deleteResult = useCallback(async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه المعركة؟')) return;
    const { error: deleteError } = await safeFetch(`/api/exams/results/${id}`, { method: "DELETE" }, null);
    if (!deleteError) setResults((r) => r.filter((x) => x.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-40 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-red-600/10 blur-[130px] rounded-full opacity-20 -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Header: The Chamber Arrival --- */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6">
          
           <div className="inline-flex items-center gap-3 rounded-full border border-red-500/30 bg-red-500/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
              <Sword className="h-5 w-5" />
              <span>ردهة التحديات الكبرى</span>
           </div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
              غرفة <span className={STYLES.neonText}>الاختبارات</span> 🏛️
           </h1>
           <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl mx-auto leading-relaxed">
              هنا تُختبر القدرات وتُصقل المهارات. اختر ساحة معركتك، دوّن إنجازاتك، وراقب نمو قوتك القتالية ضد أصعب العقبات.
           </p>
        </motion.div>

        {/* --- Main Grid: Portal & Registry --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* --- Left: Past Exams (Table Scrolls) --- */}
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center justify-between gap-6 border-b border-white/5 pb-8">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-primary/10 rounded-2xl border border-primary/30">
                        <BookOpen className="w-6 h-6 text-primary" />
                     </div>
                     <div>
                        <h2 className="text-2xl font-black text-white">لفائف المعارك السابقة</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">امتحانات تجريبية للتدريب</p>
                     </div>
                  </div>
                  <Badge className="bg-white/5 text-gray-500 h-8 px-4 rounded-xl border border-white/10 uppercase font-black text-[10px] tracking-widest">{exams.length} متاح</Badge>
               </div>

               {isLoading ?
            <div className="h-96 flex flex-col items-center justify-center gap-4 opacity-50">
                     <div className="h-12 w-12 border-t-2 border-primary rounded-full animate-spin" />
                     <p className="text-xs font-black uppercase tracking-widest text-primary">جاري فك تشفير اللفائف...</p>
                  </div> :

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <AnimatePresence>
                        {exams.map((exam, idx) =>
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={STYLES.glass + " p-6 group hover:border-primary/50 transition-all hover:translate-y-[-5px]"}>
                  
                              <div className="flex flex-col h-full justify-between gap-6">
                                 <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                       <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-black text-gray-500 uppercase tracking-widest">{exam.subject}</div>
                                       <div className="text-[10px] font-black text-primary/70 uppercase tracking-widest">{exam.year}</div>
                                    </div>
                                    <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-relaxed line-clamp-2">{exam.title}</h3>
                                 </div>
                                 <a
                      href={exam.url}
                      target="_blank"
                      rel="noreferrer"
                      className="h-12 w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-2xl group-hover:bg-primary group-hover:border-primary transition-all text-sm font-black text-white">
                      
                                    <span>بدء التحدي</span>
                                    <ExternalLink className="w-4 h-4" />
                                 </a>
                              </div>
                           </motion.div>
                )}
                     </AnimatePresence>
                  </div>
            }
            </div>

            {/* --- Right: Grade Registry (The Forge) --- */}
            <div className="lg:col-span-4 space-y-8">
               <div className={STYLES.glass + " p-10 border-amber-500/20 shadow-amber-500/5 relative overflow-hidden"}>
                  <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
                  
                  <div className="relative z-10 space-y-8">
                     <div className="flex flex-col items-center gap-4 text-center">
                        <div className="p-4 bg-amber-500/20 rounded-3xl border border-amber-500/30">
                           <Award className="w-8 h-8 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" />
                        </div>
                        <h2 className="text-2xl font-black text-white">سجل الانتصارات</h2>
                        <p className="text-sm text-gray-500 font-medium">قم بتدوين نتائج معاركك لتوثيق تاريخك المجيد</p>
                     </div>

                     <form className="space-y-6" onSubmit={addResult}>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">اختر ساحة القتال</Label>
                           <Select value={examId} onValueChange={setExamId} required>
								<SelectTrigger className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-black text-right pr-6">
									<SelectValue placeholder="اختر الامتحان" />
								</SelectTrigger>
								<SelectContent className="bg-background border-white/10 text-white font-medium">
									{exams.map((exam) =>
                        <SelectItem key={exam.id} value={exam.id} className="focus:bg-primary focus:text-white">
											{exam.subject} - {exam.title} ({exam.year})
										</SelectItem>
                        )}
								</SelectContent>
						   </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">الدرجة النهائية</Label>
                              <Input
                        type="number"
                        placeholder="100"
                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-black text-center text-xl focus:border-amber-500/50"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        required />
                      
                           </div>
                           <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">توقيت المعركة</Label>
                              <Input
                        type="date"
                        className="h-14 bg-white/5 border-white/10 rounded-2xl text-white font-bold px-4"
                        value={takenAt}
                        onChange={(e) => setTakenAt(e.target.value)} />
                      
                           </div>
                        </div>

                        <Button type="submit" disabled={isSubmitting} className="h-16 w-full bg-amber-500 text-black font-black text-lg rounded-2xl shadow-xl shadow-amber-500/20 hover:scale-[1.03] transition-transform active:scale-95 disabled:opacity-50">
                           {isSubmitting ? "جاري تدوين السجلات..." : "تثبيت النتيجة الآن"}
                        </Button>
                     </form>
                  </div>
               </div>

               {/* Stats Summary Panel */}
               <div className={STYLES.glass + " p-8 flex items-center justify-between gap-6"}>
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">المعدل القتالي</p>
                     <p className="text-3xl font-black text-white">
                        {results.length > 0 ? (results.reduce((a, b) => a + b.score, 0) / results.length).toFixed(1) : '---'}
                     </p>
                  </div>
                  <div className="h-12 w-px bg-white/5" />
                  <div className="space-y-1">
                     <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">أعلى قوة</p>
                     <p className="text-3xl font-black text-emerald-400">
                        {results.length > 0 ? Math.max(...results.map((r) => r.score)) : '---'}
                     </p>
                  </div>
               </div>
            </div>
        </div>

        {/* --- Lower Section: The History Log --- */}
        <div className="pt-12 space-y-12">
            <div className="flex items-center gap-4">
               <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                  <Scroll className="w-6 h-6 text-gray-400" />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-white">أرشيف المحارب</h2>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">تاريخ مواجهاتك الكامل في القاعة</p>
               </div>
            </div>

            <div className={STYLES.glass + " p-0 overflow-hidden"}>
               <div className="divide-y divide-white/5">
                  {results.length === 0 ?
              <div className="p-20 text-center space-y-4 opacity-30">
                        <Flame className="w-16 h-16 mx-auto text-gray-500" />
                        <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">لم يتم خوض أي معارك رسمية حتى الآن</p>
                     </div> :

              <AnimatePresence>
                        {results.map((result, idx) =>
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="p-8 flex items-center justify-between hover:bg-white/[0.02] group transition-all">
                  
                              <div className="flex items-center gap-8">
                                 <div className={`h-16 w-16 rounded-[1.5rem] flex items-center justify-center text-xl font-black shadow-2xl transition-transform group-hover:rotate-6 ${result.score >= 90 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : result.score >= 70 ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                    {result.score}%
                                 </div>
                                 <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                       <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors">{result.exam.subject} - {result.exam.title}</h4>
                                       <Badge className="bg-white/5 text-[10px] font-black h-5 uppercase tracking-tighter border-white/10">{result.exam.year}</Badge>
                                    </div>
                                    <div className="flex items-center gap-6 text-xs font-bold text-gray-500">
                                       <div className="flex items-center gap-2">
                                          <Calendar className="w-4 h-4" />
                                          <span>{new Date(result.takenAt).toLocaleDateString('ar-EG')}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                          <Target className="w-4 h-4 text-primary/70" />
                                          <span className="uppercase tracking-widest">{result.score >= 90 ? 'رتبة أسطورية' : 'رتبة قتالية'}</span>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteResult(result.id)}
                    className="h-12 w-12 rounded-2xl hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition-all">
                    
                                 <Trash2 className="h-5 w-5" />
                              </Button>
                           </motion.div>
                )}
                     </AnimatePresence>
              }
               </div>
            </div>
        </div>
      </div>
    </div>);

}