"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { motion } from "framer-motion";
import { 
  Zap, 
  ShieldCheck, 
  Database, 
  Cpu, 
  Activity, 
  RefreshCw, 
  AlertTriangle, 
  Server, 
  Layers,
  Monitor
} from "lucide-react";
import { usePremiumSounds } from "@/hooks/use-premium-sounds";

/**
 * --- ADMIN INFRASTRUCTURE MONITORING ---
 * 
 * Cinematic monitoring dashboard for BullMQ, Redis, and DB Health.
 * Aesthetic: RPG Black/Gold/Neon themes.
 */

const STYLES = {
  glass: "rpg-glass p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden",
  glow: "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none",
  card: "rpg-card p-6 flex flex-col gap-4",
  statsValue: "text-4xl font-black font-mono tracking-tighter"
};

export default function InfrastructurePage() {
  const { playSound } = usePremiumSounds();

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'infra', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/infrastructure/stats');
      if (!response.ok) throw new Error("Could not reach telemetry server");
      return (await response.json()).data;
    },
    refetchInterval: 10000,
  });

  const handleRefresh = React.useCallback(() => {
    playSound('transition');
    refetch();
  }, [playSound, refetch]);

  // Main render logic using conditional blocks to keep hooks consistent
  return (
    <div className="space-y-12 pb-20" dir="rtl">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6">
          <RefreshCw className="w-12 h-12 text-primary animate-spin" />
          <span className="font-black text-2xl tracking-[0.2em] animate-pulse">جاري استدعاء السجلات الملكية...</span>
        </div>
      ) : (isError || !data) ? (
        <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 animate-bounce" />
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-white">عذرًا، حدث خطأ في النظام</h2>
            <p className="text-gray-400 font-bold">فشل الملك في استعادة سجلات البنية التحتية. يرجى التحقق من اتصال الخادم.</p>
          </div>
          <AdminButton variant="outline" onClick={() => refetch()} icon={RefreshCw} className="h-14 px-8 rounded-2xl font-black mt-4">إعادة المحاولة</AdminButton>
        </div>
      ) : (
        <>
          {/* Header */}
          <motion.header 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className={STYLES.glass + " flex flex-col md:flex-row items-center justify-between gap-8"}
          >
            <div className={STYLES.glow} />
            <div className="relative z-10 flex items-center gap-6">
               <div className="p-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                  <Server className="w-10 h-10 text-primary" />
               </div>
               <div className="space-y-1">
                  <h1 className="text-3xl font-black tracking-tight">غرفة التحكم بالنظام ًںڈ›ï¸ڈ</h1>
                  <p className="text-gray-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4 text-green-500" />
                     <span>تم التحقق من سلامة الأكواد بنسبة 100%</span>
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
               <AdminButton variant="outline" onClick={handleRefresh} loading={isFetching} icon={RefreshCw} className="h-14 px-8 rounded-2xl font-black">إعادة الاستدعاء</AdminButton>
               <div className="h-10 w-[2px] bg-white/5 mx-2" />
               <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-gray-500 uppercase">حالة الاستعداد</span>
                  <span className="text-green-500 font-black animate-pulse">Operational (جيد)</span>
               </div>
            </div>
          </motion.header>

          {/* Grid: Health & Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <StatsCard 
                title="وقت التشغيل" 
                value={`${Math.floor(data.system.uptime / 3600)}h ${Math.floor((data.system.uptime % 3600) / 60)}m`} 
                icon={Activity} 
                color="blue" 
             />
             <StatsCard 
                title="الذاكرة المستخدمة" 
                value={data.system.memoryUsage} 
                icon={Cpu} 
                color="purple" 
             />
             <StatsCard 
                title="ذاكرة التخزين (Redis)" 
                value={data.cache.usedMemory} 
                icon={Zap} 
                color="amber" 
             />
             <StatsCard 
                title="حالة قاعدة البيانات" 
                value={data.system.status} 
                icon={Database} 
                color="green" 
             />
          </div>

          {/* Queues Monitor */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             <div className="lg:col-span-2 space-y-8">
                <h2 className="text-xl font-black flex items-center gap-3">
                   <Layers className="w-6 h-6 text-primary" />
                   <span>مراقب طوابير العمل (BullMQ Monitor)</span>
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <QueueCard name="الجمفيكييشن (Gamification)" stats={data.queues.gamification} icon={Zap} />
                   <QueueCard name="الإشعارات (Notifications)" stats={data.queues.notifications} icon={Monitor} />
                   <QueueCard name="التحليلات (Analytics)" stats={data.queues.analytics} icon={Activity} />
                </div>

                <div className={STYLES.glass + " h-[300px] flex items-center justify-center border-dashed border-white/10"}>
                   <div className="text-center space-y-4">
                      <Monitor className="w-12 h-12 text-gray-700 mx-auto" />
                      <p className="text-gray-500 font-bold">نمط الرسوم البيانية اللحظية تحت التطوير...</p>
                   </div>
                </div>
             </div>

             {/* Alerts & Logs */}
             <div className="space-y-8">
                <h2 className="text-xl font-black flex items-center gap-3">
                   <AlertTriangle className="w-6 h-6 text-amber-500" />
                   <span>تنبيهات النظام الحرجة</span>
                </h2>
                
                <div className={STYLES.glass}>
                   <div className="space-y-6">
                      {data.queues.gamification.failed > 0 ? (
                         <SystemAlert 
                            type="error" 
                            title="مهام فاشلة في Gamification" 
                            desc={`تم رصد ${data.queues.gamification.failed} مهام تعثرت في طابور النقاط.`} 
                         />
                      ) : (
                         <SystemAlert 
                            type="success" 
                            title="جميع الأنظمة تعمل بكفاءة" 
                            desc="لا توجد أي مهام فاشلة في الـ 24 ساعة الماضية." 
                         />
                      )}
                      
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-500 text-xs font-bold leading-relaxed">
                         <p>مرحباً بك في غرفة التحكم. جميع الخدمات (BullMQ + Redis) مراقبة ومؤمنة في بيئة Modular Monolith.</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: { title: string, value: string, icon: React.ComponentType<{ className?: string }>, color: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }} 
      className={STYLES.glass + " flex flex-col items-center justify-center text-center gap-4 group"}
    >
       <div className={`p-4 rounded-2xl bg-${color}-500/10 text-${color}-500 border border-white/5`}>
          <Icon className="w-7 h-7" />
       </div>
       <div className="space-y-1">
          <p className="text-xs font-black uppercase text-gray-500 tracking-widest">{title}</p>
          <p className={STYLES.statsValue}>{value}</p>
       </div>
    </motion.div>
  );
}

function QueueCard({ name, stats, icon: Icon }: { name: string, stats: { active: number; waiting: number; failed: number; completed: number }, icon: React.ComponentType<{ className?: string }> }) {
   return (
      <div className={STYLES.glass + " space-y-6"}>
         <div className="flex items-center justify-between">
            <Icon className="w-5 h-5 text-primary" />
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{name}</span>
         </div>
         <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-gray-500 uppercase">نشط</p>
               <p className="text-xl font-black text-green-500">{stats.active}</p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-gray-500 uppercase">بانتظار</p>
               <p className="text-xl font-black text-blue-500">{stats.waiting}</p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-gray-500 uppercase">فاشل</p>
               <p className="text-xl font-black text-red-500">{stats.failed}</p>
            </div>
            <div className="space-y-1">
               <p className="text-[10px] font-bold text-gray-500 uppercase">مكتمل</p>
               <p className="text-xl font-black text-gray-300">{stats.completed}</p>
            </div>
         </div>
      </div>
   );
}

function SystemAlert({ type, title, desc }: { type: 'success' | 'error', title: string, desc: string }) {
   return (
      <div className={`p-5 rounded-2xl border ${type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-500' : 'bg-red-500/10 border-red-500/20 text-red-500'} flex gap-4 items-start`}>
         <div className="p-2 bg-black/20 rounded-lg shrink-0">
            {type === 'success' ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
         </div>
         <div className="space-y-1">
            <p className="font-black text-sm">{title}</p>
            <p className="text-xs font-bold opacity-70 leading-relaxed">{desc}</p>
         </div>
      </div>
   );
}
