"use client";

import { useEffect, useState } from "react";
import { ensureUser } from "@/lib/user-utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, 
  UserCheck, 
  MapPin, 
  Clock, 
  Plus, 
  ExternalLink, 
  Sparkles, 
  Shield, 
  Sword, 
  Scroll, 
  Zap, 
  Info,
  Calendar,
  LayoutDashboard,
  Target,
  Flame,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

type Teacher = { id: string; name: string; subject: string; onlineUrl?: string | null };
type Lesson = { id: string; title: string; location: string; startTime: string; endTime: string; teacher: Teacher };
type Schedule = { id: string; planJson: string };

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all hover:scale-[1.01]",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function TeachersPage() {
	const [userId, setUserId] = useState<string | null>(null);
	const [teachers, setTeachers] = useState<Teacher[]>([]);
	const [lessons, setLessons] = useState<Lesson[]>([]);
	const [schedule, setSchedule] = useState<Schedule | null>(null);

	const [teacherId, setTeacherId] = useState("");
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [startTime, setStartTime] = useState("");
	const [endTime, setEndTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		ensureUser().then(setUserId);
	}, []);

	useEffect(() => {
		(async () => {
      setIsLoading(true);
			const ts = await fetch("/api/teachers").then((r) => r.json());
			setTeachers(ts);
      setIsLoading(false);
		})();
	}, []);

	useEffect(() => {
		if (!userId) return;
		(async () => {
			const ls = await fetch(`/api/lessons?userId=${userId}`).then((r) => r.json());
			setLessons(ls);
			const sch = await fetch(`/api/schedule?userId=${userId}`).then((r) => r.json());
			setSchedule(sch);
		})();
	}, [userId]);

	async function addLesson(e: React.FormEvent) {
		e.preventDefault();
		if (!userId || !teacherId || !title || !location || !startTime || !endTime) return;
		const res = await fetch("/api/lessons", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ userId, teacherId, title, location, startTime, endTime }),
		});
		const newLesson = await res.json();
		setLessons((l) => [...l, newLesson]);
		
		try {
			const plan = schedule?.planJson ? JSON.parse(schedule.planJson) : {};
			const dayKey = new Date(startTime).toLocaleDateString("en-CA");
			plan[dayKey] = plan[dayKey] || [];
			plan[dayKey].push({ type: "lesson", title, location, startTime, endTime, teacherId });
			const s = await fetch("/api/schedule", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ userId, plan }),
			}).then((r) => r.json());
			setSchedule(s);
		} catch (err) { console.error(err); }
		setTeacherId(""); setTitle(""); setLocation(""); setStartTime(""); setEndTime("");
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
        
        {/* --- Header: The Guild Entrance --- */}
        <motion.div
           initial={{ opacity: 0, y: -30 }}
           animate={{ opacity: 1, y: 0 }}
           className="text-center space-y-6"
        >
           <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
              <Users className="h-5 w-5" />
              <span>نقابة المعلمين الكبار</span>
           </div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
              مجلس <span className={STYLES.neonText}>الحكماء</span> 🧙‍♂️
           </h1>
           <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl mx-auto leading-relaxed">
              تعرف على كبار المخططين والمدربين في رحلتك التعليمية. هنا يمكنك العثور على رفقاء الطريق الذين سيقودونك نحو السيادة العلمية المطلقة.
           </p>
        </motion.div>

        {/* --- Top Masters: List --- */}
        <div className="space-y-8">
           <div className="flex items-center justify-between border-b border-white/5 pb-8">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                    <UserCheck className="w-6 h-6 text-primary" />
                 </div>
                 <h2 className="text-2xl font-black text-white">قائمة الأساتذة العظام</h2>
              </div>
              <Badge className="bg-white/5 text-gray-500 font-black px-4 h-8 rounded-xl border border-white/10">{teachers.length} معلم</Badge>
           </div>

           {isLoading ? (
              <div className="h-40 flex items-center justify-center opacity-50">
                 <div className="h-8 w-8 border-t-2 border-primary rounded-full animate-spin" />
              </div>
           ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {teachers.map((t, idx) => (
                    <motion.div
                       key={t.id}
                       initial={{ opacity: 0, scale: 0.9 }}
                       animate={{ opacity: 1, scale: 1 }}
                       transition={{ delay: idx * 0.05 }}
                       className={STYLES.glass + " p-6 group hover:border-primary/50 transition-all"}
                    >
                       <div className="flex items-center gap-6">
                          <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-white group-hover:bg-primary group-hover:scale-110 transition-all">
                             {t.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="space-y-1">
                             <h4 className="text-lg font-black text-white group-hover:text-primary transition-colors">{t.name}</h4>
                             <p className="text-[10px] font-black uppercase tracking-widest text-primary/70">{t.subject}</p>
                          </div>
                       </div>
                       {t.onlineUrl && (
                          <a 
                             href={t.onlineUrl} 
                             target="_blank" 
                             rel="noreferrer"
                             className="mt-6 h-10 w-full flex items-center justify-center gap-2 bg-primary/10 border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary hover:text-white transition-all"
                          >
                             <ExternalLink className="w-3.5 h-3.5" />
                             <span>الملف السحري</span>
                          </a>
                       )}
                    </motion.div>
                 ))}
              </div>
           )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* --- Left: Registration (The Summoning) --- */}
            <div className="lg:col-span-4 space-y-8">
               <div className={STYLES.glass + " p-8 border-primary/20 shadow-primary/5"}>
                  <div className="flex flex-col items-center gap-4 text-center mb-8">
                     <div className="p-4 bg-primary/10 rounded-3xl border border-primary/30">
                        <Plus className="w-8 h-8 text-primary" />
                     </div>
                     <h2 className="text-2xl font-black text-white">برمجة حصة جديدة</h2>
                     <p className="text-xs text-gray-500 font-medium">أضف حصتك الواقعية ليتم دمجها في خارطتك الزمنية</p>
                  </div>

                  <form className="space-y-5" onSubmit={addLesson}>
                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">القائد المسؤول</Label>
                        <Select value={teacherId} onValueChange={setTeacherId} required>
                           <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl text-white font-black text-right pr-6">
                              <SelectValue placeholder="اختر المعلم" />
                           </SelectTrigger>
                           <SelectContent className="bg-background border-white/10 text-white font-medium">
                              {teachers.map((t) => (
                                 <SelectItem key={t.id} value={t.id} className="focus:bg-primary focus:text-white">
                                    {t.subject} - {t.name}
                                 </SelectItem>
                              ))}
                           </SelectContent>
                        </Select>
                     </div>

                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">عنوان التدريب</Label>
                        <Input className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white" placeholder="مثلاً: مراجعة القطوع المخروطية" value={title} onChange={(e) => setTitle(e.target.value)} required />
                     </div>

                     <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">إحداثيات المقر (المكان)</Label>
                        <Input className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" placeholder="مثلاً: سنتر الأمل، القاعة الكبرى" value={location} onChange={(e) => setLocation(e.target.value)} required />
                     </div>

                     <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">بداية الغارة (الوقت)</Label>
                           <Input type="datetime-local" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase text-gray-500 tracking-widest px-1">انتهاء المهمة</Label>
                           <Input type="datetime-local" className="h-12 bg-white/5 border-white/10 rounded-xl px-4 font-bold text-white text-right" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
                        </div>
                     </div>

                     <Button type="submit" className="h-14 w-full bg-primary text-white font-black text-lg rounded-xl shadow-xl shadow-primary/20 hover:scale-[1.03] transition-transform active:scale-95">
                        استدعاء المهمة الآن
                     </Button>
                  </form>
               </div>
            </div>

            {/* --- Right: Planned Lessons (The Ledger) --- */}
            <div className="lg:col-span-8 space-y-8">
               <div className="flex items-center gap-4 border-b border-white/5 pb-8">
                  <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
                     <Calendar className="w-6 h-6 text-gray-400" />
                  </div>
                  <h2 className="text-2xl font-black text-white">العمليات الميدانية القادمة</h2>
               </div>

               <div className={STYLES.glass + " p-0 overflow-hidden"}>
                  <div className="divide-y divide-white/5">
                     {lessons.length === 0 ? (
                        <div className="p-20 text-center space-y-4 opacity-30">
                           <MapPin className="w-16 h-16 mx-auto text-gray-500" />
                           <p className="text-sm font-black uppercase tracking-[0.2em] text-gray-400">لا توجد غارات تعليمية مخططة حالياً</p>
                        </div>
                     ) : (
                        <AnimatePresence>
                           {lessons.map((l, idx) => (
                              <motion.div
                                 key={l.id}
                                 initial={{ opacity: 0, x: 30 }}
                                 animate={{ opacity: 1, x: 0 }}
                                 transition={{ delay: idx * 0.05 }}
                                 className="p-8 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-white/[0.02] group transition-all"
                              >
                                 <div className="flex items-center gap-8 text-right md:text-right w-full md:w-auto">
                                    <div className="h-16 w-16 min-w-[64px] rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                                       <Flame className="w-8 h-8 group-hover:scale-125 transition-transform" />
                                    </div>
                                    <div className="space-y-1">
                                       <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors">{l.title}</h4>
                                       <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-gray-500">
                                          <div className="flex items-center gap-2">
                                             <UserCheck className="w-4 h-4 text-primary/70" />
                                             <span className="text-primary-light">{l.teacher.name}</span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                             <MapPin className="w-4 h-4" />
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
                              </motion.div>
                           ))}
                        </AnimatePresence>
                     )}
                  </div>
               </div>
            </div>
        </div>
      </div>
    </div>
	);
}
