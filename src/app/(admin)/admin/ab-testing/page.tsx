"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { StatusBadge } from "@/components/admin/ui/admin-badge";
import { Split, BarChart3, TrendingUp, Search, Plus, Play, Pause, Activity } from "lucide-react";
import { motion } from "framer-motion";

// Types
interface Experiment {
  id: string;
  title: string;
  status: "active" | "completed" | "paused";
  variantA: { name: string; views: number; completionRate: number; avgScore?: number };
  variantB: { name: string; views: number; completionRate: number; avgScore?: number };
  winner?: "A" | "B";
  startDate: string;
}

const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: "exp_1",
    title: "مقارنة شرح الميكانيكا (فيديو طويل vs فيديو تفاعلي 5 دقائق)",
    status: "active",
    variantA: { name: "الدرس الكلاسيكي المعتاد", views: 420, completionRate: 35 },
    variantB: { name: "الدرس التفاعلي السريع (مجزأ)", views: 450, completionRate: 72 },
    startDate: "2026-03-10",
  },
  {
    id: "exp_2",
    title: "توزيع أسئلة الباب الثاني أحياء (من سهل لصعب vs مختلط)",
    status: "completed",
    variantA: { name: "من السهل إلى الصعب", views: 1200, completionRate: 98, avgScore: 85 },
    variantB: { name: "مختلط عشوائياً", views: 1150, completionRate: 65, avgScore: 60 },
    winner: "A",
    startDate: "2026-02-15",
  },
];

export default function ABTestingPage() {
  const [experiments, setExperiments] = React.useState<Experiment[]>(MOCK_EXPERIMENTS);

  return (
    <div className="space-y-8 pb-10">
      <PageHeader
        title="مختبر النمو وتجارب (A/B Testing)"
        description="قارن بين نسختين من الاختبارات أو الدروس، واعرف أيهما يحقق أفضل تفاعل (Engagement) وأعلى معدلات استيعاب لدى المحاربين."
      >
        <AdminButton icon={Split} className="h-12 rounded-xl text-lg font-bold gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 shadow-[0_0_20px_rgba(20,184,166,0.3)]">
          إنشاء تجربة انقسام جديدة
        </AdminButton>
      </PageHeader>

      {/* Lab Stats */}
      <div className="grid gap-6 md:grid-cols-3">
         <AdminCard variant="glass" className="p-6 border-emerald-500/20 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-bold text-muted-foreground mb-1">المحاربون المجربون (Traffic)</p>
               <h3 className="text-4xl font-black text-emerald-500">3,220</h3>
            </div>
            <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500">
               <UsersIcon className="w-7 h-7" />
            </div>
         </AdminCard>
         <AdminCard variant="glass" className="p-6 border-teal-500/20 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-bold text-muted-foreground mb-1">النمو المُضاف من التجارب</p>
               <h3 className="text-4xl font-black text-teal-500">+28%</h3>
            </div>
            <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center text-teal-500">
               <TrendingUp className="w-7 h-7" />
            </div>
         </AdminCard>
         <AdminCard variant="glass" className="p-6 border-blue-500/20 shadow-sm flex items-center justify-between">
            <div>
               <p className="text-sm font-bold text-muted-foreground mb-1">تجارب نشطة الآن</p>
               <h3 className="text-4xl font-black text-blue-500">1</h3>
            </div>
            <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500">
               <Activity className="w-7 h-7" />
            </div>
         </AdminCard>
      </div>

      <h3 className="text-xl font-black flex items-center gap-2 mt-12 mb-6">
        <BarChart3 className="w-6 h-6 text-primary" />
        لوحة المختبر (Active & Past Experiments)
      </h3>

      <div className="space-y-8">
        {experiments.map((exp, idx) => {
           const maxViews = Math.max(exp.variantA.views, exp.variantB.views);
           
           return (
              <motion.div 
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                 <AdminCard variant="glass" className={`p-0 overflow-hidden border-2 ${exp.status === 'active' ? 'border-primary shadow-[0_4px_30px_rgba(var(--primary),0.1)]' : 'border-border/50 opacity-80'}`}>
                    {/* Header */}
                    <div className={`p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${exp.status === 'active' ? 'bg-primary/5' : 'bg-muted/30'}`}>
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                            <StatusBadge status={exp.status === 'active' ? 'active' : 'inactive'} />
                            <span className="text-xs text-muted-foreground font-bold tracking-widest uppercase">
                               بدأت في {exp.startDate}
                            </span>
                         </div>
                         <h4 className="text-lg font-black">{exp.title}</h4>
                       </div>
                       
                       <div className="flex gap-2">
                          {exp.status === 'active' ? (
                            <>
                               <AdminButton variant="outline" size="sm" icon={Pause} className="font-bold border-amber-500/50 hover:bg-amber-500/10 text-amber-500">
                                  إيقاف مؤقت
                               </AdminButton>
                               <AdminButton variant="default" size="sm" className="font-bold bg-foreground text-background">
                                  إعلان الفائز (Declare Winner)
                               </AdminButton>
                            </>
                          ) : (
                             <AdminButton variant="outline" size="sm" icon={Search} className="font-bold">
                                تقرير تفصيلي
                             </AdminButton>
                          )}
                       </div>
                    </div>

                    {/* Analytics Body */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x lg:divide-x-reverse divide-border/50 border-t border-border/50">
                       
                       {/* Variant A */}
                       <div className={`p-8 relative ${exp.winner === "A" ? 'bg-emerald-500/5' : ''}`}>
                          {exp.winner === "A" && (
                            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg">
                               الفائز بالاستيعاب! (Winner)
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-muted-foreground mb-6">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-500/20 text-slate-500 font-black flex items-center justify-center text-sm border-2 border-slate-500/30">A</span>
                            <h5 className="font-bold text-foreground text-base leading-tight">النسخة (أ): {exp.variantA.name}</h5>
                          </div>

                          <div className="space-y-6">
                            <div>
                               <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                                  <span>عدد القراءات/المشاهدات (Traffic)</span>
                                  <span>{exp.variantA.views} مُسجل</span>
                               </div>
                               <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="bg-slate-500 h-full rounded-full" style={{ width: `${(exp.variantA.views / maxViews) * 100}%` }}></div>
                               </div>
                            </div>
                            <div>
                               <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                                  <span>معدل الإكمال والنهاية (Completion Rate)</span>
                                  <span className={exp.variantA.completionRate > 60 ? 'text-emerald-500' : 'text-orange-500'}>{exp.variantA.completionRate}%</span>
                               </div>
                               <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${exp.variantA.completionRate > 60 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${exp.variantA.completionRate}%` }}></div>
                               </div>
                            </div>
                            
                            {exp.variantA.avgScore && (
                              <div className="pt-4 border-t border-dashed flex justify-between items-center bg-background/50 p-2 rounded-lg">
                                <span className="text-xs font-bold text-muted-foreground">متوسط درجات الطلاب</span>
                                <span className="font-black text-lg">{exp.variantA.avgScore}%</span>
                              </div>
                            )}
                          </div>
                       </div>

                       {/* Variant B */}
                       <div className={`p-8 relative ${exp.winner === "B" ? 'bg-emerald-500/5' : ''}`}>
                          {exp.winner === "B" && (
                            <div className="absolute top-4 left-4 bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md tracking-widest shadow-lg">
                               الفائز بالاستيعاب! (Winner)
                            </div>
                          )}
                          <div className="flex items-center gap-3 text-muted-foreground mb-6">
                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-teal-500/20 text-teal-500 font-black flex items-center justify-center text-sm border-2 border-teal-500/30">B</span>
                            <h5 className="font-bold text-foreground text-base leading-tight">النسخة (ب): {exp.variantB.name}</h5>
                          </div>

                          <div className="space-y-6">
                            <div>
                               <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                                  <span>عدد القراءات/المشاهدات (Traffic)</span>
                                  <span>{exp.variantB.views} مُسجل</span>
                               </div>
                               <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="bg-teal-500 h-full rounded-full" style={{ width: `${(exp.variantB.views / maxViews) * 100}%` }}></div>
                               </div>
                            </div>
                            <div>
                               <div className="flex justify-between text-xs font-bold text-muted-foreground mb-2">
                                  <span>معدل الإكمال والنهاية (Completion Rate)</span>
                                  <span className={exp.variantB.completionRate > 60 ? 'text-emerald-500' : 'text-orange-500'}>{exp.variantB.completionRate}%</span>
                               </div>
                               <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${exp.variantB.completionRate > 60 ? 'bg-emerald-500' : 'bg-orange-500'}`} style={{ width: `${exp.variantB.completionRate}%` }}></div>
                               </div>
                            </div>

                            {exp.variantB.avgScore && (
                              <div className="pt-4 border-t border-dashed flex justify-between items-center bg-background/50 p-2 rounded-lg">
                                <span className="text-xs font-bold text-muted-foreground">متوسط درجات الطلاب</span>
                                <span className="font-black text-lg">{exp.variantB.avgScore}%</span>
                              </div>
                            )}
                          </div>
                       </div>

                    </div>
                 </AdminCard>
              </motion.div>
           );
        })}
      </div>
    </div>
  );
}

// Inline fallback since Lucide's Users might be named slightly differently if exported vs destructured, though `Users` is standard.
function UsersIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );
}
