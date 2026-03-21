"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton, IconButton } from "@/components/admin/ui/admin-button";
import { StatusBadge } from "@/components/admin/ui/admin-badge";
import {
  Gamepad2,
  Trophy,
  Play,
  Users,
  Timer,
  Volume2,
  Plus,
  Rocket,
  Settings2,
  Crown,
  StopCircle,
  QrCode
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// Types
interface LiveLobby {
  id: string;
  title: string;
  pinCode: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  players: { id: string; name: string; score: number }[];
  currentQuestion: number;
  totalQuestions: number;
}

const MOCK_LOBBY: LiveLobby = {
  id: "c_1",
  title: "بطولة مراجعة الكيمياء العضوية",
  pinCode: "849201",
  status: "WAITING",
  players: [
    { id: "p1", name: "أحمد محمود", score: 0 },
    { id: "p2", name: "سارة طارق", score: 0 },
    { id: "p3", name: "محمد علي", score: 0 },
    { id: "p4", name: "نور حسن", score: 0 },
  ],
  currentQuestion: 1,
  totalQuestions: 15,
};

export default function ContestsPage() {
  const [activeLobby, setActiveLobby] = React.useState<LiveLobby | null>(MOCK_LOBBY);
  const [showConfig, setShowConfig] = React.useState(false);
  const [pulse, setPulse] = React.useState(false);

  // Lobby pulse animation
  React.useEffect(() => {
    if (activeLobby?.status === "WAITING") {
      const p = setInterval(() => setPulse(x => !x), 1000);
      return () => clearInterval(p);
    }
  }, [activeLobby]);

  const startGame = () => {
    if (activeLobby) {
      setActiveLobby({ ...activeLobby, status: "IN_PROGRESS" });
    }
  };

  const endGame = () => {
    if (activeLobby) {
      setActiveLobby({ ...activeLobby, status: "FINISHED" });
    }
  };

  const createGame = () => {
    setActiveLobby({
      id: `c_${Date.now()}`,
      title: "مسابقة فجائية للمحاربين",
      pinCode: Math.floor(100000 + Math.random() * 900000).toString(),
      status: "WAITING",
      players: [],
      currentQuestion: 1,
      totalQuestions: 10,
    });
    setShowConfig(false);
  };

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="المسابقات الحية (Live Contests Arena)"
        description="نظام Kahoot المُصغر لبناء قاعات المسابقات، واختبار التفاعل الحيّ بين مجموعات المحاربين مع نظام نقاط فوري."
      >
        {!activeLobby || activeLobby.status === "FINISHED" ? (
          <AdminButton onClick={() => setShowConfig(!showConfig)} icon={Plus}>
             إنشاء ساحة معركة جديدة
          </AdminButton>
        ) : (
          <div className="flex bg-accent rounded-xl p-1 border">
             <div className="px-4 py-2 bg-background shadow-sm rounded-lg text-sm font-bold flex items-center gap-2 text-primary">
                <Gamepad2 className="w-4 h-4" />
                توجد مسابقة نشطة حالياً
             </div>
          </div>
        )}
      </PageHeader>

      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Game Engine Config / Creation */}
        <AnimatePresence>
          {(!activeLobby || activeLobby.status === "FINISHED" || showConfig) && (
            <motion.div 
              className="lg:col-span-1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AdminCard variant="glass" className="p-6 border-primary/20 bg-background/50 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                   <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Settings2 className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-black text-lg">محرك الساحة (Game Engine)</h3>
                      <p className="text-[11px] text-muted-foreground font-bold">تجهيز واختيار الأسئلة للبطولة المُقبلة</p>
                   </div>
                </div>

                <div className="space-y-5">
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">اسم المعركة (البطولة)</label>
                     <input type="text" className="w-full h-11 bg-card border border-border/50 rounded-lg px-3 text-sm font-bold" placeholder="مثال: بطولة مراجعة ليلة الامتحان" />
                   </div>
                   
                   <div className="space-y-2">
                     <label className="text-xs font-bold text-muted-foreground uppercase">استدعاء الأسئلة من (Question Bank)</label>
                     <select className="w-full h-11 bg-card border border-border/50 rounded-lg px-3 text-sm font-bold appearance-none">
                       <option>وحدة الكهربية - فيزياء (20 سؤال)</option>
                       <option>المنهج الكامل - لغة عربية (50 سؤال)</option>
                       <option>توليد عشوائي بالذكاء الاصطناعي (AI)</option>
                     </select>
                   </div>

                   <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted-foreground uppercase rounded-md bg-accent px-2 py-1">المدة للسؤال</label>
                         <input type="number" defaultValue={30} className="w-full h-11 bg-card border border-border/50 rounded-lg text-center font-bold text-primary" />
                      </div>
                      <div className="space-y-2">
                         <label className="text-[10px] font-black text-muted-foreground uppercase rounded-md bg-accent px-2 py-1">XP الجائزة</label>
                         <input type="number" defaultValue={2500} className="w-full h-11 bg-card border border-border/50 rounded-lg text-center font-bold text-amber-500" />
                      </div>
                   </div>

                   <AdminButton onClick={createGame} className="w-full h-12 uppercase tracking-widest font-black mt-4 gap-2" icon={Rocket}>
                      فتح غرف الانتظار (Lobby)
                   </AdminButton>
                </div>
              </AdminCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Arena Screen */}
        {activeLobby && activeLobby.status !== "FINISHED" && (
           <motion.div 
             className="lg:col-span-2"
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
           >
              <AdminCard variant="glass" className="h-full min-h-[500px] border-4 border-primary/20 p-0 overflow-hidden relative shadow-[0_0_40px_rgba(var(--primary),0.1)] flex flex-col">
                 
                 {/* Top Status Bar */}
                 <div className="bg-foreground/5 p-4 border-b border-border/50 flex items-center justify-between backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4">
                       <div className="bg-primary text-primary-foreground px-4 py-2 rounded-xl font-black text-2xl tracking-widest flex items-center gap-3 shadow-lg">
                          <QrCode className="w-6 h-6 opacity-70" />
                          {activeLobby.pinCode}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">غرفة التحدي النشطة</span>
                         <h2 className="font-bold text-lg leading-none mt-1">{activeLobby.title}</h2>
                       </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                       <div className="bg-accent/50 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-bold border border-border">
                          <Users className="w-4 h-4 text-emerald-500" />
                          <span className="text-emerald-500">{activeLobby.players.length}</span>
                       </div>
                       {activeLobby.status === "WAITING" && (
                         <span className="flex h-3 w-3 relative">
                           <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                           <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                         </span>
                       )}
                    </div>
                 </div>

                 {/* Center Screen: Waiting Lounge or In Progress Game */}
                 <div className="flex-1 p-8 flex flex-col items-center justify-center relative overflow-hidden">
                    {/* Visual BG Lines */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
                    
                    {activeLobby.status === "WAITING" ? (
                       <div className="text-center z-10 w-full max-w-2xl">
                          <motion.div 
                             animate={{ scale: pulse ? 1.05 : 1 }}
                             transition={{ duration: 0.5 }}
                             className="mb-8 p-6 bg-background/80 backdrop-blur-md rounded-3xl border-2 border-primary/50 shadow-2xl inline-block"
                          >
                             <Volume2 className="w-12 h-12 text-primary mx-auto mb-4 animate-bounce" />
                             <h1 className="text-5xl font-black tabular-nums tracking-widest text-foreground drop-shadow-md">
                                {activeLobby.pinCode}
                             </h1>
                             <p className="text-muted-foreground font-bold mt-2 uppercase tracking-wider text-xs">أدخل الكود في المنصة للإنضمام</p>
                          </motion.div>

                          <div className="flex flex-wrap items-center justify-center gap-3">
                             {activeLobby.players.map((p, i) => (
                                <motion.div 
                                  key={p.id}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.1 }}
                                  className="bg-card border border-border/50 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-2 shadow-sm"
                                >
                                  <Avatar className="w-6 h-6">
                                     <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-black">{p.name.substring(0,2)}</AvatarFallback>
                                  </Avatar>
                                  {p.name}
                                </motion.div>
                             ))}
                             {activeLobby.players.length === 0 && (
                                <p className="text-muted-foreground font-bold animate-pulse text-sm">بانتظار دخول المحاربين...</p>
                             )}
                          </div>
                          
                          {activeLobby.players.length > 0 && (
                             <div className="mt-12 flex justify-center">
                               <AdminButton size="lg" icon={Play} onClick={startGame} className="h-16 px-12 rounded-full text-xl font-black bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.4)]">
                                 ابدأ المعركة! (Start Game)
                               </AdminButton>
                             </div>
                          )}
                       </div>
                    ) : (
                       <div className="text-center w-full z-10 flex flex-col h-full">
                          <div className="flex justify-between items-center w-full mb-8">
                             <div className="bg-accent/80 backdrop-blur-md px-4 py-2 rounded-2xl border font-black text-lg flex items-center gap-2 text-primary shadow-sm">
                                <Timer className="w-5 h-5" />
                                14s
                             </div>
                             <div className="bg-background px-4 py-2 rounded-2xl border font-black text-sm text-muted-foreground shadow-sm">
                                سؤال {activeLobby.currentQuestion} من {activeLobby.totalQuestions}
                             </div>
                          </div>
                          
                          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-3xl mx-auto w-full">
                             <h2 className="text-2xl md:text-4xl font-black mb-12 bg-card/80 backdrop-blur-md p-6 sm:p-10 rounded-3xl border-2 border-border/50 shadow-xl leading-relaxed">
                                ما هو التركيب الجزيئي للبنزين العطري وما هي خاصية الرنين التي تميزه؟
                             </h2>
                             
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                                {["C6H6 حلقي مستوي", "C6H12 سلسلة", "C5H10 متبادل", "C4H8 متعدد"].map((ans, i) => {
                                   const colors = ["bg-red-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500"];
                                   return (
                                     <div key={i} className={`${colors[i]} h-16 sm:h-20 rounded-2xl flex items-center justify-center border-4 border-black/10 shadow-lg cursor-not-allowed`}>
                                        <span className="text-white font-black text-lg drop-shadow-md">{ans}</span>
                                     </div>
                                   )
                                })}
                             </div>
                          </div>

                          <div className="mt-8 flex justify-end w-full">
                             <AdminButton variant="destructive" onClick={endGame} icon={StopCircle} className="rounded-xl font-bold">
                                إنهاء المسابقة وإعلان النتائج
                             </AdminButton>
                          </div>
                       </div>
                    )}
                 </div>
              </AdminCard>
           </motion.div>
        )}
      </div>
    </div>
  );
}
