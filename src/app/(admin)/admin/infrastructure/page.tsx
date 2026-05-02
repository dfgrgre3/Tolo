"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminButton } from "@/components/admin/ui/admin-button";
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
   Monitor,
   Terminal,
} from "lucide-react";
import { RealTimePerformanceChart } from "@/components/admin/monitoring/RealTimePerformanceChart";
import { PremiumLogViewer } from "@/components/admin/monitoring/PremiumLogViewer";
import { adminFetch } from "@/lib/api/admin-api";

const STYLES = {
   glass: "admin-glass p-8 rounded-[2rem] border border-white/5 backdrop-blur-xl relative overflow-hidden",
   glow: "absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none",
   card: "admin-card p-6 flex flex-col gap-4",
   statsValue: "text-4xl font-black font-mono tracking-tighter"
};

export default function InfrastructurePage() {
   const { data, isLoading, isError, refetch, isFetching } = useQuery({
      queryKey: ['admin', 'infra', 'stats'],
      queryFn: async () => {
         const response = await adminFetch('infrastructure/stats');
         if (!response.ok) throw new Error("Could not reach telemetry server");
         const json = await response.json();
         return json.data;
      },
      refetchInterval: 10000,
   });

   return (
      <div className="space-y-12 pb-20" dir="rtl">
         {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-6">
               <RefreshCw className="w-12 h-12 text-primary animate-spin" />
               <span className="font-black text-2xl tracking-[0.2em]">جاري فحص حالة النظام...</span>
            </div>
         ) : (isError || !data) ? (
            <div className="flex flex-col items-center justify-center min-h-[600px] gap-6 text-center">
               <AlertTriangle className="w-16 h-16 text-red-500" />
               <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white">خطأ في الاتصال بنظام المراقبة</h2>
                  <p className="text-gray-400 font-bold">يرجى التأكد من تشغيل الخادم الخلفي وصحة الصلاحيات.</p>
               </div>
               <AdminButton variant="outline" onClick={() => refetch()} icon={RefreshCw} className="h-14 px-8 rounded-2xl font-black mt-4">إعادة المحاولة</AdminButton>
            </div>
         ) : (
            <>
               {/* Header */}
               <header className={STYLES.glass + " flex flex-col md:flex-row items-center justify-between gap-8"}>
                  <div className={STYLES.glow} />
                  <div className="relative z-10 flex items-center gap-6">
                     <div className="p-4 bg-primary/10 rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
                        <Server className="w-10 h-10 text-primary" />
                     </div>
                     <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tight">مراقبة البنية التحتية</h1>
                        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest flex items-center gap-2">
                           <ShieldCheck className="w-4 h-4 text-green-500" />
                           <span>حالة النظام: {data.dbStatus === 'healthy' ? 'مستقر' : 'يوجد تنبيهات'}</span>
                        </p>
                     </div>
                  </div>

                  <div className="relative z-10 flex items-center gap-4 bg-black/40 p-4 rounded-3xl border border-white/5">
                     <div className="flex flex-col items-end px-4 border-l border-white/10">
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">تحديث تلقائي</span>
                        <span className="text-sm font-black text-primary">كل 10 ثواني</span>
                     </div>
                     <AdminButton
                        variant="premium"
                        size="lg"
                        onClick={() => refetch()}
                        loading={isFetching}
                        icon={RefreshCw}
                        className="h-14 px-8 rounded-2xl shadow-xl"
                     >
                        تحديث يدوي
                     </AdminButton>
                  </div>
               </header>

               {/* Metrics Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className={STYLES.glass}>
                     <div className="flex items-center justify-between mb-4">
                        <Monitor className="w-6 h-6 text-sky-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase">Goroutines</span>
                     </div>
                     <div className={STYLES.statsValue + " text-sky-500"}>{data.goroutines}</div>
                     <div className="text-xs text-gray-400 font-bold mt-2">العمليات المتزامنة النشطة</div>
                  </div>

                  <div className={STYLES.glass}>
                     <div className="flex items-center justify-between mb-4">
                        <Layers className="w-6 h-6 text-purple-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase">Memory (Alloc)</span>
                     </div>
                     <div className={STYLES.statsValue + " text-purple-500"}>{data.memoryMiB} MiB</div>
                     <div className="text-xs text-gray-400 font-bold mt-2">ذاكرة التطبيق المخصصة</div>
                  </div>

                  <div className={STYLES.glass}>
                     <div className="flex items-center justify-between mb-4">
                        <Database className="w-6 h-6 text-amber-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase">DB Status</span>
                     </div>
                     <div className={STYLES.statsValue + " text-amber-500"}>{data.dbStatus === 'healthy' ? 'STABLE' : 'ERROR'}</div>
                     <div className="text-xs text-gray-400 font-bold mt-2">اتصال قاعدة البيانات الرئيسية</div>
                  </div>

                  <div className={STYLES.glass}>
                     <div className="flex items-center justify-between mb-4">
                        <Zap className="w-6 h-6 text-green-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase">Redis Latency</span>
                     </div>
                     <div className={STYLES.statsValue + " text-green-500"}>{data.redisLatency}ms</div>
                     <div className="text-xs text-gray-400 font-bold mt-2">سرعة استجابة نظام التخزين المؤقت</div>
                  </div>
               </div>

               {/* Queues Monitor */}
               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 space-y-8">
                     <div className={STYLES.glass}>
                        <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                           <Activity className="w-5 h-5 text-orange-500" />
                           <span>طوابير العمل (Queues)</span>
                        </h3>
                        <div className="space-y-6">
                           {Object.entries(data.queues || {}).map(([name, q]: [string, any]) => (
                              <div key={name} className="space-y-2">
                                 <div className="flex items-center justify-between">
                                    <span className="text-xs font-black uppercase text-gray-400">{name}</span>
                                    <span className="text-xs font-black text-white">{q.active} نشط</span>
                                 </div>
                                 <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div 
                                       className="h-full bg-primary" 
                                       style={{ width: `${Math.min(100, (q.active / (q.active + q.waiting + 1)) * 100)}%` }} 
                                    />
                                 </div>
                                 <div className="flex justify-between text-[10px] font-bold text-gray-500">
                                    <span>معلق: {q.waiting}</span>
                                    <span>فاشل: {q.failed}</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-2">
                     <div className={STYLES.glass + " h-full"}>
                        <div className="flex items-center justify-between mb-6">
                           <h3 className="text-lg font-black flex items-center gap-2">
                              <Terminal className="w-5 h-5 text-sky-400" />
                              <span>سجلات النظام (System Logs)</span>
                           </h3>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mb-4 italic">* يتم جلب السجلات من الخادم الخلفي بشكل لحظي.</p>
                        <PremiumLogViewer />
                     </div>
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
