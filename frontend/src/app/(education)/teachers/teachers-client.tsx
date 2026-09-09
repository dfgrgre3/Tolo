"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { m, AnimatePresence } from "framer-motion";
import {
  Users,
  UserCheck,
  MapPin,
  Clock,
  Plus,
  ExternalLink,
   Calendar,
   Search,
   SlidersHorizontal,
   AlertCircle,
   CheckCircle2,
   Video,
   BookOpen,
   RefreshCw } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logger } from '@/lib/logger';
import { apiClient } from "@/lib/api/api-client";

export type Teacher = {id: string;name: string;subject: string;onlineUrl?: string | null;};
type Lesson = {id: string;title: string;location: string;startTime: string;endTime: string;teacherId: string;teacher?: Teacher | null;};
type Schedule = {id: string;planJson: string;};

function toApiTimestamp(value: string): string {
   const timestamp = new Date(value);
   if (Number.isNaN(timestamp.getTime())) {
      throw new Error("Invalid lesson time");
   }
   return timestamp.toISOString();
}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all hover:scale-[1.01]",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

interface TeachersClientProps {
  /** قائمة المعلمين مجمّعة من الخادم — تُلغي جلب المتصفح عند توفرها. */
  initialTeachers?: Teacher[];
}

export default function TeachersPage({ initialTeachers }: TeachersClientProps) {
  const hasServerTeachers = Array.isArray(initialTeachers) && initialTeachers.length > 0;
  const { isAuthenticated } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers ?? []);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [schedule, setSchedule] = useState<Schedule | null>(null);

  const [teacherId, setTeacherId] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
   const [searchQuery, setSearchQuery] = useState("");
   const [subjectFilter, setSubjectFilter] = useState("all");
   const [isLoading, setIsLoading] = useState(!hasServerTeachers);
   const [isSubmitting, setIsSubmitting] = useState(false);
   const [loadError, setLoadError] = useState("");
   const [formError, setFormError] = useState("");
   const [successMessage, setSuccessMessage] = useState("");

   const subjects = useMemo(
      () => Array.from(new Set(teachers.map((teacher) => teacher.subject).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar")),
      [teachers]
   );

   const filteredTeachers = useMemo(() => {
      const normalizedQuery = searchQuery.trim().toLocaleLowerCase("ar");
      return teachers.filter((teacher) => {
         const matchesSubject = subjectFilter === "all" || teacher.subject === subjectFilter;
         const matchesSearch = !normalizedQuery || [teacher.name, teacher.subject].some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery));
         return matchesSubject && matchesSearch;
      });
   }, [searchQuery, subjectFilter, teachers]);

   const sortedLessons = useMemo(
      () => [...lessons].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
      [lessons]
   );

  // جلب المعلمين من المتصفح يحدث فقط عندما يفشل تجمع الخادم —
  // البيانات الخاصة بالمستخدم (الحصص/الجدول) تبقى في المتصفح دائماً.
  useEffect(() => {
      if (hasServerTeachers) return;
    (async () => {
      setIsLoading(true);
         setLoadError("");
      try {
        const ts = await apiClient.get<Teacher[]>("/teachers");
            setTeachers(Array.isArray(ts) ? ts : []);
      } catch (err) {
        logger.error("Failed to fetch teachers:", err);
            setLoadError("تعذر تحميل قائمة المدرسين. حاول تحديث الصفحة.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [hasServerTeachers]);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        // Session-scoped: the backend resolves the caller from the JWT, so
        // no ?userId= is appended (IDOR/BOLA hardening).
        const ls = await apiClient.get<Lesson[]>(`/lessons`);
        setLessons(ls);
        const sch = await apiClient.get<Schedule>(`/schedule`);
        setSchedule(sch);
      } catch (err) {
        logger.error("Failed to fetch user data:", err);
      }
    })();
  }, [isAuthenticated]);

  async function addLesson(e: React.FormEvent) {
    e.preventDefault();
      setFormError("");
      setSuccessMessage("");
      if (!isAuthenticated) {
         setFormError("سجّل الدخول أولًا حتى تتمكن من إضافة حصة إلى جدولك.");
         return;
      }
      if (!teacherId || !title.trim() || !location.trim() || !startTime || !endTime) {
         setFormError("أكمل جميع بيانات الحصة قبل الحفظ.");
         return;
      }
      if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
         setFormError("يجب أن يكون وقت الانتهاء بعد وقت البدء.");
         return;
      }
      setIsSubmitting(true);
    try {
         const newLesson = await apiClient.post<Lesson>("/lessons", {
            teacherId,
                  title: title.trim(),
                  location: location.trim(),
            startTime: toApiTimestamp(startTime),
            endTime: toApiTimestamp(endTime)
         });
      setLessons((l) => [...l, newLesson]);
    } catch (err) {
      logger.error("Failed to add lesson:", err);
         setFormError("تعذر حفظ الحصة حاليًا. تحقق من اتصالك وحاول مرة أخرى.");
         setIsSubmitting(false);
      return;
    }

    try {
      const plan = schedule?.planJson ? JSON.parse(schedule.planJson) : {};
      const dayKey = new Date(startTime).toLocaleDateString("en-CA");
      plan[dayKey] = plan[dayKey] || [];
      plan[dayKey].push({ type: "lesson", title, location, startTime, endTime, teacherId });
      // Backend expects `planJson` as a required JSON-encoded string
      // (see UpdateSchedule in activity_handler.go); the user is resolved
      // server-side from the session.
      const s = await apiClient.post<Schedule>("/schedule", {
        planJson: JSON.stringify(plan)
      });
      setSchedule(s);
      } catch (err) {
         logger.error(String(err));
         setFormError("تمت إضافة الحصة، لكن تعذر تحديث الخطة الدراسية.");
         setIsSubmitting(false);
         return;
      }
    setTeacherId("");setTitle("");setLocation("");setStartTime("");setEndTime("");
      setIsSubmitting(false);
      setSuccessMessage("تمت إضافة الحصة إلى جدولك بنجاح.");
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 blur-[130px] rounded-full opacity-40 -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-600/10 blur-[130px] rounded-full opacity-20 translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
            {/* --- Page header --- */}
        <m.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
               className="space-y-6 rounded-[2rem] border border-white/10 bg-white/[0.03] px-6 py-10 text-center shadow-2xl shadow-black/20 md:px-12">
          
           <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
              <Users className="h-5 w-5" />
                     <span>دليل المدرسين</span>
           </div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
                     اختر <span className={STYLES.neonText}>مدرسك</span> بثقة
           </h1>
           <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl mx-auto leading-relaxed">
                     تعرّف على المدرسين حسب التخصص، ثم أضف حصصك الواقعية إلى جدولك الدراسي في خطوات بسيطة.
           </p>
        </m.div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
               {[
                  { label: "مدرس متاح", value: teachers.length, icon: Users },
                  { label: "تخصص دراسي", value: subjects.length, icon: BookOpen },
                  { label: "حصة مجدولة", value: lessons.length, icon: Calendar }
               ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                     <div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                     <div className="text-right"><p className="text-2xl font-black text-white">{value}</p><p className="text-xs font-bold text-gray-500">{label}</p></div>
                  </div>
               ))}
            </div>

            {/* --- Teachers directory --- */}
        <div className="space-y-8">
                <div className="flex flex-col gap-5 border-b border-white/5 pb-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <UserCheck className="w-6 h-6 text-primary" />
                 </div>
                         <div><h2 className="text-2xl font-black text-white">المدرسون</h2><p className="mt-1 text-sm text-gray-500">ابحث عن الخبرة المناسبة لمادتك</p></div>
              </div>
                     <div className="flex flex-col gap-3 sm:flex-row">
                        <div className="relative min-w-0 sm:w-64">
                           <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                           <Input aria-label="البحث عن مدرس" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="ابحث بالاسم أو المادة" className="h-11 rounded-xl border-white/10 bg-white/5 pr-10 text-white" />
                        </div>
                        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                           <SelectTrigger aria-label="تصفية حسب المادة" className="h-11 min-w-[170px] rounded-xl border-white/10 bg-white/5 text-white"><SlidersHorizontal className="ml-2 h-4 w-4 text-primary" /><SelectValue placeholder="كل المواد" /></SelectTrigger>
                           <SelectContent className="border-white/10 bg-background text-white"><SelectItem value="all">كل المواد</SelectItem>{subjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent>
                        </Select>
                     </div>
           </div>

           {isLoading ?
               <div className="flex h-40 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.02] text-gray-400">
                 <div className="h-8 w-8 border-t-2 border-primary rounded-full animate-spin" />
              </div> :
               loadError ?
                  <div className="flex flex-col items-center gap-4 rounded-3xl border border-red-400/20 bg-red-400/5 p-10 text-center"><AlertCircle className="h-10 w-10 text-red-300" /><p className="font-bold text-red-100">{loadError}</p><Button variant="outline" onClick={() => window.location.reload()} className="border-white/10 text-white"><RefreshCw className="ml-2 h-4 w-4" /> تحديث الصفحة</Button></div> :
               filteredTeachers.length === 0 ?
                  <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center"><Search className="h-10 w-10 text-gray-500" /><p className="font-bold text-gray-300">لا يوجد مدرسون يطابقون بحثك</p><Button variant="ghost" onClick={() => { setSearchQuery(""); setSubjectFilter("all"); }} className="text-primary">مسح الفلاتر</Button></div> :
               <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                         {filteredTeachers.map((t, idx) =>
            <m.div
              key={t.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={STYLES.glass + " p-6 group hover:border-primary/50 transition-all"}>
              
                       <div className="flex items-center gap-6">
                          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-white group-hover:bg-primary group-hover:scale-110 transition-all">
                             {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-lg font-black text-white group-hover:text-primary transition-colors">{t.name}</h4>
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t.subject}</p>
                          </div>
                       </div>
                       {t.onlineUrl &&
              <a
                href={t.onlineUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 h-10 w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all">
                
                             <ExternalLink className="w-3.5 h-3.5" />
                             <span>عرض الملف</span>
                          </a>
              }
                    </m.div>
            )}
              </div>
          }
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* --- Lesson planner --- */}
            <div className="lg:col-span-4 space-y-8">
               <div className={STYLES.glass + " p-8 border-primary/20 shadow-primary/5"}>
                  <div className="flex flex-col items-center gap-4 text-center mb-8">
                     <div className="p-4 bg-primary/10 rounded-3xl border border-primary/30">
                        <Plus className="w-8 h-8 text-primary" />
                     </div>
                     <h2 className="text-2xl font-black text-white">إضافة حصة</h2>
                     <p className="text-xs text-gray-500 font-medium">نظّم حصصك الواقعية داخل جدولك الدراسي</p>
                  </div>

                  {formError && <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl border border-red-400/20 bg-red-400/5 p-3 text-sm font-bold leading-6 text-red-200"><AlertCircle className="mt-1 h-4 w-4 shrink-0" />{formError}</div>}
                  {successMessage && <div role="status" className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3 text-sm font-bold leading-6 text-emerald-200"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0" />{successMessage}</div>}

                  <form className="space-y-5" onSubmit={addLesson}>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">المدرس</Label>
                        <Select value={teacherId} onValueChange={setTeacherId} required>
                           <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-black text-right pr-6">
                              <SelectValue placeholder="اختر المعلم" />
                           </SelectTrigger>
                           <SelectContent className="bg-background border-white/10 text-white font-medium">
                              {teachers.map((t) =>
                      <SelectItem key={t.id} value={t.id} className="focus:bg-primary focus:text-white">
                                    {t.subject} - {t.name}
                                 </SelectItem>
                      )}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="lesson-title" className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">عنوان الحصة</Label>
                        <Input id="lesson-title" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white" placeholder="مثلاً: مراجعة القطوع المخروطية" value={title} onChange={(e) => setTitle(e.target.value)} required />
                     </div>

                     <div className="space-y-2">
                        <Label htmlFor="lesson-location" className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">المكان</Label>
                        <Input id="lesson-location" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" placeholder="مثلاً: سنتر الأمل، القاعة الكبرى" value={location} onChange={(e) => setLocation(e.target.value)} required />
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                           <Label htmlFor="lesson-start" className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">وقت البدء</Label>
                           <Input id="lesson-start" type="datetime-local" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                           <Label htmlFor="lesson-end" className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">وقت الانتهاء</Label>
                           <Input id="lesson-end" type="datetime-local" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>
                     </div>

                     <Button type="submit" disabled={isSubmitting} className="h-14 w-full bg-primary text-white font-black text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.03] transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
                        {isSubmitting ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> جارٍ الحفظ...</> : <><Plus className="ml-2 h-5 w-5" /> إضافة إلى الجدول</>}
                     </Button>
                  </form>
               </div>
            </div>

            {/* --- Planned lessons --- */}
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                     <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <div><h2 className="text-2xl font-black text-white">جدولي القادم</h2><p className="mt-1 text-sm text-gray-500">الحصص مرتبة حسب وقت البدء</p></div>
               </div>

               <div className={STYLES.glass + " p-0 overflow-hidden"}>
                  <div className="divide-y divide-white/5">
                      {sortedLessons.length === 0 ?
                   <div className="space-y-4 p-20 text-center">
                           <MapPin className="w-16 h-16 mx-auto text-gray-500" />
                          <p className="text-sm font-black text-gray-400">لا توجد حصص مجدولة حاليًا</p>
                        </div> :

                <AnimatePresence>
                           {sortedLessons.map((l, idx) =>
                  <m.div
                    key={l.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/[0.02] group transition-all">
                    
                                 <div className="flex items-center gap-8 text-right md:text-right w-full md:w-auto">
                                    <div className="h-16 w-16 min-w-[64px] rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                       <BookOpen className="w-8 h-8 group-hover:scale-125 transition-transform" />
                                    </div>
                                    <div className="space-y-1">
                                       <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors">{l.title}</h4>
                                       <div className="flex wrap items-center gap-4 text-xs font-bold text-gray-500">
                                          <div className="flex items-center gap-2">
                                             <UserCheck className="w-4 h-4 text-primary/70" />
                                             <span className="text-primary-light">
                                                {l.teacher?.name ?? teachers.find((teacher) => teacher.id === l.teacherId)?.name ?? "معلم غير متاح"}
                                             </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             {l.location.toLowerCase().includes("http") ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                                             <span>{l.location}</span>
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-center md:items-end gap-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 text-white font-black text-sm">
                                       <Clock className="w-4 h-4 text-primary" />
                                       <span>{new Date(l.startTime).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(l.startTime).toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                 </div>
                              </m.div>
                  )}
                        </AnimatePresence>
                }
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>);

}
