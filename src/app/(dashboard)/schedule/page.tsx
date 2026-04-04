"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
// @ts-ignore - react-dnd type issue
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useWebSocket } from "@/contexts/websocket-context";
import { safeGetItem, safeSetItem, safeFetch } from "@/lib/safe-client-utils";

import { motion, AnimatePresence } from "framer-motion";
import {

  Clock,
  Plus,
  Trash2,

  Save,
  Code,
  Sparkles,

  Sword,
  Target,
  Zap,


  Map,
  Flame } from
"lucide-react";
import { logger } from '@/lib/logger';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const LOCAL_USER_KEY = "tw_user_id";

type PlanBlock = {id: string;type: string;title: string;color?: string;location?: string;startTime: string;endTime: string;teacherId?: string;taskId?: string;examId?: string;};

type Plan = Record<string, PlanBlock[]>;

type Schedule = {id: string;planJson: string;version: number;};

type Task = {id: string;title: string;};

type Exam = {id: string;title: string;subject: string;year: number;};

type ExamsResponse = {exams: Exam[];};

const daysOrder = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"] as const;

function dayKeyFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

const typeOptions = [
{ value: "study", label: "مذاكرة", color: "#60a5fa", icon: BookOpen },
{ value: "review", label: "مراجعة", color: "#34d399", icon: RefreshCw },
{ value: "task", label: "مهمة", color: "#f59e0b", icon: Target },
{ value: "exam", label: "امتحان", color: "#ef4444", icon: Flame },
{ value: "lesson", label: "درس", color: "#a78bfa", icon: Users }];


const BookOpenIcon = BookOpen;
const RefreshCwIcon = RefreshCw;
const UsersIcon = Users;

function BookOpen(props: React.SVGProps<SVGSVGElement>) {return <Sparkles {...props} />;}
function RefreshCw(props: React.SVGProps<SVGSVGElement>) {return <Zap {...props} />;}
function Users(props: React.SVGProps<SVGSVGElement>) {return <Sword {...props} />;}

const STYLES = {
  glass: "relative overflow-hidden rounded-[2rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-4 transition-all hover:scale-[1.02] active:scale-[0.98]",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

function validateTimeFormat(time: string): boolean {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

function hasTimeConflict(blocks: PlanBlock[]): boolean {
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const start1 = blocks[i].startTime;
      const end1 = blocks[i].endTime;
      const start2 = blocks[j].startTime;
      const end2 = blocks[j].endTime;

      if (start1 >= start2 && start1 < end2 ||
      end1 > start2 && end1 <= end2 ||
      start2 >= start1 && start2 < end1) {
        return true;
      }
    }
  }
  return false;
}

const DraggableBlock = memo(({
  block,
  dayKey,
  index,
  onRemove,
  onOpenLinked
}: {block: PlanBlock;dayKey: string;index: number;onRemove: (dayKey: string, blockId: string) => void;onOpenLinked: (block: PlanBlock) => void;}) => {
  // Drag functionality removed for now
  const isDragging = false;
  const drag = (_node: HTMLLIElement | null) => {};

  const typeOpt = typeOptions.find((o) => o.value === block.type) || typeOptions[0];
  const Icon = typeOpt.icon;

  return (
    <motion.li
      ref={drag}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative group rounded-2xl border border-white/10 p-4 transition-all cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30 scale-95' : 'opacity-100 hover:border-primary/50 hover:bg-white/[0.03]'}`}
      style={{ borderRight: `4px solid ${block.color || typeOpt.color}` }}
      onClick={() => onOpenLinked(block)}>
      
			<div className="flex flex-col gap-2">
			   <div className="flex items-start justify-between">
            <span className="font-bold text-sm text-white line-clamp-1 group-hover:text-primary transition-colors">{block.title}</span>
            <button
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
            onClick={(e) => {e.stopPropagation();onRemove(dayKey, block.id);}}>
            
              <Trash2 className="h-3.5 w-3.5" />
            </button>
         </div>
         
         <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
            <div className="flex items-center gap-2">
               <div className="p-1 rounded-md bg-white/5">
                  <Icon className="h-3 w-3 text-gray-400" />
               </div>
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{typeOpt.label}</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/40 border border-white/5">
               <Clock className="w-3 h-3 text-gray-500" />
               <span className="text-[10px] font-bold text-gray-300">{block.startTime}</span>
            </div>
         </div>
			</div>
      
      {/* Linked Indicator */}
      {(block.taskId || block.examId) &&
      <div className="absolute -left-1 -top-1">
           <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
        </div>
      }
		</motion.li>);

});

DraggableBlock.displayName = 'DraggableBlock';

export default function SchedulePage() {
  const router = useRouter();
  const { socket: _socket } = useWebSocket();
  const [userId, setUserId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [plan, setPlan] = useState<Plan>({});
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonText, setJsonText] = useState("{}");
  const [, setError] = useState("");
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingExams, setLoadingExams] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("study");
  const [newColor, setNewColor] = useState("#60a5fa");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [, setTasks] = useState<Task[]>([]);
  const [, setExams] = useState<Exam[]>([]);
  const [_selectedTaskId, setSelectedTaskId] = useState("");
  const [_selectedExamId, setSelectedExamId] = useState("");

  const weekDates = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const diffToSat = (day + 1) % 7;
    const sat = new Date(now);
    sat.setDate(now.getDate() - diffToSat);
    const arr: {label: string;key: string;isToday: boolean;}[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sat);
      d.setDate(sat.getDate() + i);
      const k = dayKeyFromDate(d);
      arr.push({ label: daysOrder[i], key: k, isToday: k === dayKeyFromDate(new Date()) });
    }
    return arr;
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      setLoadingUser(true);
      try {
        let id: string | null = safeGetItem(LOCAL_USER_KEY, { fallback: null });
        if (!id) {
          const { data, error: _error } = await safeFetch<{id: string;}>("/api/users/guest", { method: "POST" }, { id: '' });
          if (data && data.id) {id = data.id as string;safeSetItem(LOCAL_USER_KEY, id);}
        }
        if (id) setUserId(id);
      } catch (_error) {logger.error("Failed to load user:", _error);} finally
      {setLoadingUser(false);}
    };
    void loadUser();
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoadingSchedule(true);
        const { data: sch } = await safeFetch<Schedule>(`/api/schedule?userId=${userId}`, undefined, { id: '', planJson: '{}', version: 0 });
        if (sch) {
          setSchedule(sch);
          const parsed: Plan = JSON.parse(sch?.planJson || "{}");
          setPlan(parsed);
          setJsonText(JSON.stringify(parsed, null, 2));
        }
      } finally {setLoadingSchedule(false);}

      setLoadingTasks(true);
      safeFetch<Task[]>(`/api/tasks?userId=${userId}`, undefined, []).then(({ data }) => data && setTasks(data)).finally(() => setLoadingTasks(false));

      setLoadingExams(true);
      safeFetch<ExamsResponse>("/api/exams", undefined, { exams: [] }).
      then(({ data }) => setExams(Array.isArray(data?.exams) ? data.exams : [])).
      finally(() => setLoadingExams(false));
    })();
  }, [userId]);

  async function persist(next: Plan) {
    if (!userId) return;
    setSaving(true);
    setError("");
    try {
      const { data: updated, response } = await safeFetch<Schedule>("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, plan: next, version: schedule?.version })
      }, null);

      if (updated) {
        setSchedule(updated);
        setPlan(next);
        setJsonText(JSON.stringify(next, null, 2));
      } else if (response?.status === 409) {
        setError("تم تعديل الجدول من جهاز آخر. يرجى التحديث.");
      }
    } finally {setSaving(false);}
  }

  function onDrop(e: React.DragEvent, toKey: string) {
    const raw = e.dataTransfer.getData("application/json");
    if (!raw) return;
    const { fromKey, blockId } = JSON.parse(raw) as {fromKey: string;blockId: string;};
    if (!fromKey || !blockId || fromKey === toKey) return;
    const src = [...(plan[fromKey] || [])];
    const idx = src.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const [moved] = src.splice(idx, 1);
    const dst = [...(plan[toKey] || [])];
    dst.push(moved);
    persist({ ...plan, [fromKey]: src, [toKey]: dst });
  }

  function createBlock() {
    if (!activeDay || !newTitle.trim() || !newStartTime || !newEndTime) return;
    if (!validateTimeFormat(newStartTime) || !validateTimeFormat(newEndTime)) return;
    const id = crypto.randomUUID();
    const extra: Partial<PlanBlock> = {};
    if (newType === "task" && _selectedTaskId) extra.taskId = _selectedTaskId;
    if (newType === "exam" && _selectedExamId) extra.examId = _selectedExamId;
    const next = {
      ...plan,
      [activeDay]: [...(plan[activeDay] || []), { id, type: newType, title: newTitle, color: newColor, startTime: newStartTime, endTime: newEndTime, ...extra }]
    };
    if (hasTimeConflict(next[activeDay])) {setError("توجد تعارضات في الأوقات");return;}
    persist(next);
    setActiveDay(null);
    setNewTitle("");
    setNewType("study");
    setNewStartTime("");
    setNewEndTime("");
  }

  function removeBlock(dayKey: string, blockId: string) {
    const next = { ...plan, [dayKey]: (plan[dayKey] || []).filter((b) => b.id !== blockId) };
    persist(next);
  }

  function openLinked(b: PlanBlock) {
    if (b.taskId) router.push(`/tasks?focus=${b.taskId}`);else
    if (b.examId) router.push(`/exams?focus=${b.examId}`);
  }

  return (
    <div className="min-h-screen bg-background text-gray-100 overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-0 w-full h-[600px] bg-primary/5 blur-[120px] rounded-b-[100%]" />
        <div className="absolute bottom-40 right-10 w-96 h-96 bg-blue-600/5 blur-[100px] animate-pulse" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

        <DndProvider backend={HTML5Backend}>
          <div className="mx-auto w-full max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-8 space-y-12">
            
            {/* --- Hero Section: Strategic Command --- */}
            <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className={STYLES.glass + " p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"}>
            
               <div className="space-y-4 text-center md:text-right">
                  <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
                     <Map className="h-5 w-5" />
                     <span>غرفة التخطيط الاستراتيجي</span>
                  </div>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                     خارطة <span className={STYLES.neonText}>المعارك الأسبوعية</span>
                  </h1>
                  <p className="text-lg text-gray-400 font-medium max-w-xl">
                     قم بتنظيم وقتك، حدد أهدافك، واستعد للغزو التعليمي. كل دقيقة تخطط لها هي خطوة نحو سيادتك العلمية.
                  </p>
               </div>

               <div className="flex flex-col items-center gap-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center space-y-1 min-w-[140px]">
                        <p className="text-2xl font-black text-white">{Object.values(plan).flat().length}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">مهمة مخططة</p>
                     </div>
                     <div className="p-6 rounded-3xl bg-white/5 border border-white/10 text-center space-y-1 min-w-[140px]">
                        <p className="text-2xl font-black text-white">{Object.values(plan).flat().filter((b) => b.type === 'exam').length}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">معركة وشيكة</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-3 w-full">
                     <Button
                  onClick={() => setJsonOpen((v) => !v)}
                  variant="ghost"
                  className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl gap-3 font-black text-xs uppercase tracking-widest hover:bg-white/10">
                  
                        <Code className="w-5 h-5 text-gray-500" />
                        <span>الأوامر المباشرة (JSON)</span>
                     </Button>
                     <Button className="h-14 px-8 bg-primary rounded-2xl shadow-xl shadow-primary/20 animate-pulse active:scale-95">
                        <Save className="w-6 h-6" />
                     </Button>
                  </div>
               </div>
            </motion.div>

            {/* --- JSON Override Terminal --- */}
            <AnimatePresence>
               {jsonOpen &&
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={STYLES.glass + " p-6 border-primary/30"}>
              
                     <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                           <div className="h-3 w-3 rounded-full bg-red-500" />
                           <div className="h-3 w-3 rounded-full bg-yellow-500" />
                           <div className="h-3 w-3 rounded-full bg-green-500" />
                           <span className="text-xs font-mono text-primary mr-4 uppercase tracking-widest">Master_System_Schedule.json</span>
                        </div>
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] uppercase font-black" onClick={() => setJsonOpen(false)}>إغلاق</Button>
                     </div>
                     <textarea
                className="w-full h-80 bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-sm text-primary-light focus:outline-none focus:ring-1 focus:ring-primary/30"
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)} />
              
                     <div className="flex justify-end gap-3 mt-4">
                        <Button className="h-12 px-8 bg-primary font-black rounded-xl">تفعيل المخطط البرمجي</Button>
                     </div>
                  </motion.div>
            }
            </AnimatePresence>

            {/* --- The Battlefield: Weekly Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-6">
               {weekDates.map((day, dIdx) =>
            <motion.div
              key={day.key}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: dIdx * 0.05 }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => onDrop(e, day.key)}
              className={`${STYLES.glass} !rounded-[2rem] p-5 min-h-[500px] flex flex-col gap-6 relative ${day.isToday ? 'border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.1)]' : 'border-white/5'}`}>
              
                     {day.isToday &&
              <div className="absolute top-4 left-4">
                           <Badge className="bg-primary text-white font-black animate-pulse">اليوم</Badge>
                        </div>
              }
                     
                     <div className="space-y-1">
                        <h3 className="text-xl font-black text-white">{day.label}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{day.key}</p>
                     </div>

                     <div className="flex-1 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                        <AnimatePresence mode="popLayout">
                           {(plan[day.key] || []).length === 0 ?
                  <div className="h-40 flex flex-col items-center justify-center text-center opacity-20 border-2 border-dashed border-white/20 rounded-[2rem] p-4">
                                 <Plus className="w-8 h-8 mb-2" />
                                 <p className="text-[10px] font-black uppercase tracking-widest leading-loose">منطقة خالية<br />بانتظار أوامرك</p>
                              </div> :

                  (plan[day.key] || []).map((block, bIdx) =>
                  <DraggableBlock
                    key={block.id}
                    block={block}
                    dayKey={day.key}
                    index={bIdx}
                    onRemove={removeBlock}
                    onOpenLinked={openLinked} />

                  )
                  }
                        </AnimatePresence>
                     </div>

                     <Button
                onClick={() => setActiveDay(day.key)}
                variant="ghost"
                className="mt-auto h-12 w-full bg-white/5 border border-white/10 rounded-2xl gap-2 font-black text-xs uppercase hover:bg-white/10 hover:border-primary/30 transition-all group">
                
                        <Plus className="w-4 h-4 text-gray-500 group-hover:text-primary transition-colors" />
                        <span>إضافة استراتيجية</span>
                     </Button>
                  </motion.div>
            )}
            </div>

            {/* --- Strategic Overlays: Modal --- */}
            <AnimatePresence>
               {activeDay &&
            <Modal isOpen={!!activeDay} onClose={() => setActiveDay(null)} title="تجنيد مهمة جديدة">
                     <div className="space-y-6 pt-4 text-right" dir="rtl">
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">عنوان العملية</label>
                           <input
                    className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-lg font-black focus:border-primary/50 transition-all"
                    placeholder="مثلاً: غزو الفيزياء النووية"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)} />
                  
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">نوع الاستراتيجية</label>
                              <select
                      className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-6 text-white font-black appearance-none"
                      value={newType}
                      onChange={(e) => {
                        setNewType(e.target.value);
                        const opt = typeOptions.find((o) => o.value === e.target.value);
                        if (opt) setNewColor(opt.color);
                      }}>
                      
                                 {typeOptions.map((o) => <option key={o.value} value={o.value} className="bg-background">{o.label}</option>)}
                              </select>
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">تشفير اللون</label>
                              <div className="flex items-center gap-3 h-14 px-6 bg-white/5 border border-white/10 rounded-2xl">
                                 <input type="color" className="w-10 h-10 rounded-xl bg-transparent border-none cursor-pointer" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
                                 <span className="text-xs font-mono text-gray-400 uppercase">{newColor}</span>
                              </div>
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">ساعة القذيفة (بدء)</label>
                              <input type="time" className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-black" value={newStartTime} onChange={(e) => setNewStartTime(e.target.value)} />
                           </div>
                           <div className="space-y-2">
                              <label className="text-xs font-black uppercase text-gray-500 tracking-widest px-1">انتهاء العملية</label>
                              <input type="time" className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-white font-black" value={newEndTime} onChange={(e) => setNewEndTime(e.target.value)} />
                           </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                           <Button variant="ghost" onClick={() => setActiveDay(null)} className="h-14 px-8 rounded-2xl font-black">تراجع</Button>
                           <Button onClick={createBlock} className="h-14 px-12 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/20">تثبيت المهمة</Button>
                        </div>
                     </div>
                  </Modal>
            }
            </AnimatePresence>
            
            {(loadingUser || loadingSchedule || loadingTasks || loadingExams || saving) &&
          <div className="fixed bottom-8 left-8 z-50">
                 <div className={STYLES.glass + " px-6 py-4 flex items-center gap-4 bg-primary/20 border-primary/50"}>
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-primary"></div>
                    <span className="text-xs font-black uppercase tracking-widest text-primary">تزامن المخططات...</span>
                 </div>
              </div>
          }
          </div>
        </DndProvider>
    </div>);

}
