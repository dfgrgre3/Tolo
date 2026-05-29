"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Brain,
  Bot,
  MessageSquare,
  FileText,
  Search,
  Lightbulb,
  Zap,
  Sparkles,
  Shield,
  Compass,
  Scroll,
  Loader2 } from
'lucide-react';

import { m, AnimatePresence } from "framer-motion";

import AIAssistant from './components/AIAssistant';
import ExamGenerator from './components/ExamGenerator';
import TeacherSearch from './components/TeacherSearch';
import TipsGenerator from './components/TipsGenerator';
import StudyPlanner from './features/StudyPlanner';
import LessonSummarizer from './features/LessonSummarizer';
import EssayGrader from './features/EssayGrader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth-context';

const STYLES = {
  glass: "relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-black/40 shadow-2xl backdrop-blur-2xl ring-1 ring-white/5",
  card: "rpg-card h-full p-8 transition-all",
  neonText: "rpg-neon-text font-black",
  goldText: "rpg-gold-text font-black"
};

export default function AILearningPage() {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('assistant');

  useEffect(() => {
    if (isLoading || user) return;
    const redirectTarget = pathname || '/ai';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [isLoading, pathname, router, user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-gray-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  const subjects = [
  'الرياضيات', 'العلوم', 'اللغة العربية', 'اللغة الإنجليزية', 'الدراسات الاجتماعية',
  'الفيزياء', 'الكيمياء', 'الأحياء', 'التربية الإسلامية', 'الحاسوب'];


  const years = [1, 2, 3];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden" dir="rtl">
      {/* --- Ambient Background --- */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 blur-[150px] rounded-full opacity-40 translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 blur-[150px] rounded-full opacity-30 -translate-x-1/2 translate-y-1/2" />
        <div className="absolute inset-x-0 top-1/4 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8 space-y-12">
        
        {/* --- Hero: The Oracle Entrance --- */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-6">
          
           <div className="inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-6 py-2 text-xs font-black uppercase tracking-[0.2em] text-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]">
              <Brain className="h-5 w-5" />
              <span>محراب الحكمة اللامتناهية</span>
           </div>
           <h1 className="text-4xl md:text-7xl font-black tracking-tight leading-tight">
              استشر <span className={STYLES.neonText}>العراف الذكي</span> ✨
           </h1>
           <p className="text-lg md:text-xl text-gray-400 font-medium max-w-3xl mx-auto">
              قوة الذكاء الاصطناعي بين يديك. احصل على إجابات مذهلة، امتحانات مخصصة، وتوجيهات أسطورية لترقية مستواك العسكري في عالم المعرفة.
           </p>
           <div className="flex items-center justify-center gap-4">
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-2">
                 <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">نظام التشغيل: Gemini 2.0 Flash</span>
              </div>
              <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">متصل (Online)</span>
              </div>
           </div>
        </m.div>

        {/* --- Quick Action Cards --- */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📐', label: 'اشرح نظرية', desc: 'فيثاغورس والجبر', color: 'from-blue-500/20 to-blue-600/10', border: 'border-blue-500/30' },
            { icon: '🔬', label: 'قوانين الفيزياء', desc: 'نيوتن والكهرباء', color: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30' },
            { icon: '🧪', label: 'تفاعلات كيميائية', desc: 'المعادلات والروابط', color: 'from-emerald-500/20 to-emerald-600/10', border: 'border-emerald-500/30' },
            { icon: '📝', label: 'تعبير كتابي', desc: 'كتابة وتصحيح', color: 'from-orange-500/20 to-orange-600/10', border: 'border-orange-500/30' },
          ].map((card, i) => (
            <button
              key={i}
              onClick={() => setActiveTab('assistant')}
              className={`group relative overflow-hidden rounded-3xl border ${card.border} bg-gradient-to-br ${card.color} p-6 text-right transition-all hover:scale-[1.02] hover:shadow-lg`}
            >
              <div className="text-3xl mb-3">{card.icon}</div>
              <h3 className="text-sm font-black text-white mb-1">{card.label}</h3>
              <p className="text-xs text-gray-400">{card.desc}</p>
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </m.div>

        {/* --- Usage Stats --- */}
        <m.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: MessageSquare, label: 'محادثات اليوم', value: '12', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { icon: FileText, label: 'امتحانات تم إنشاؤها', value: '5', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { icon: Sparkles, label: 'دروس تم تلخيصها', value: '8', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
            { icon: Zap, label: 'نقاط الخبرة (XP)', value: '450', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          ].map((stat, i) => (
            <div
              key={i}
              className={`rounded-2xl border ${stat.border} ${stat.bg} p-5 text-center transition-all hover:scale-[1.02]`}
            >
              <stat.icon className={`h-6 w-6 mx-auto mb-2 ${stat.color}`} />
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-gray-400 mt-1 font-bold">{stat.label}</div>
            </div>
          ))}
        </m.div>

         {/* --- Glyph Tabs: The Modes of Magic --- */}
         <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-8">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 h-auto bg-white/5 border border-white/10 rounded-[2rem] p-2 gap-1.5 backdrop-blur-2xl">
               {[
             { id: 'assistant', label: 'المساعد', icon: Bot, desc: 'حوار مباشر' },
             { id: 'exam', label: 'الامتحانات', icon: FileText, desc: 'اختبارات' },
             { id: 'planner', label: 'المخطط', icon: Compass, desc: 'جدول ذكي' },
             { id: 'summarizer', label: 'الملخص', icon: Scroll, desc: 'تبسيط' },
             { id: 'grader', label: 'المصحح', icon: Sparkles, desc: 'تقييم' },
             { id: 'teachers', label: 'المعلمين', icon: Search, desc: 'بحث' },
             { id: 'tips', label: 'النصائح', icon: Lightbulb, desc: 'استراتيجيات' }].
             map((tab) => {
               const Icon = tab.icon;
               const isActive = activeTab === tab.id;
               return (
                 <TabsTrigger
                   key={tab.id}
                   value={tab.id}
                   className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}>
                   
                        <Icon className="w-5 h-5" />
                        <div className="text-center">
                           <p className="text-xs font-bold leading-none">{tab.label}</p>
                        </div>
                     </TabsTrigger>);

             })}
            </TabsList>

           <AnimatePresence mode="wait">
              <m.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -20 }}
              transition={{ duration: 0.4 }}>
              
                 <TabsContent value="assistant" className="mt-0 outline-none">
                    <div className={STYLES.glass + " !border-primary/20"}>
                       <div className="p-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-6">
                             <div className="relative h-16 w-16 group">
                                <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full animate-pulse group-hover:bg-primary/60 transition-all" />
                                <div className="relative h-full w-full rounded-2xl bg-black border border-primary/50 flex items-center justify-center">
                                   <Bot className="w-8 h-8 text-primary shadow-[0_0_15px_rgba(var(--primary),0.5)]" />
                                </div>
                             </div>
                             <div>
                                <h3 className="text-2xl font-black text-white">العراف المستجيب</h3>
                                <p className="text-gray-500 font-medium">ذو البصيرة الرقمية ومعالج العلوم الكبرى</p>
                             </div>
                          </div>
                          <div className="flex gap-3">
                             <Button variant="ghost" className="h-12 px-6 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-gray-400 gap-2">
                                <Scroll className="w-4 h-4" />
                                <span>سجل الحكايات (History)</span>
                             </Button>
                          </div>
                       </div>
                       <div className="p-4 sm:p-8 bg-black/40 min-h-[600px] flex flex-col">
                          <div className="flex-1 rounded-3xl overflow-hidden border border-white/5 shadow-inner bg-black/20">
                             <AIAssistant
                        initialMessage="مرحباً أيها المحارب الصغير في عوالم thnawy. أنا هنا لأرشدك في ظلمات الفيزياء، وأفك لك طلاسم الكيمياء، وأترجم لك لغة الغزاة في الإنجليزية. ماذا دهاك من العلم لأساندك فيه اليوم؟"
                        placeholder="اهمس بسؤالك للعراف هنا..."
                        title="مرآة المعرفة الرقمية" />
                      
                          </div>
                       </div>
                    </div>
                 </TabsContent>

                 <TabsContent value="exam" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <ExamGenerator subjects={subjects} years={years} className="w-full" />
                    </div>
                 </TabsContent>

                 <TabsContent value="planner" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <StudyPlanner />
                    </div>
                 </TabsContent>

                 <TabsContent value="summarizer" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <LessonSummarizer />
                    </div>
                 </TabsContent>

                 <TabsContent value="grader" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <EssayGrader />
                    </div>
                 </TabsContent>

                 <TabsContent value="teachers" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <TeacherSearch subjects={subjects} className="w-full" />
                    </div>
                 </TabsContent>

                 <TabsContent value="tips" className="mt-0 outline-none">
                    <div className={STYLES.glass + " p-0"}>
                       <TipsGenerator subjects={subjects} className="w-full" />
                    </div>
                 </TabsContent>
              </m.div>
           </AnimatePresence>
        </Tabs>

        {/* --- Summary Footer: Divine Insights --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-12">
           {[
          { icon: Compass, label: "بصيرة نافذة", desc: "تحليل ذكي لنتائجك وتقديم مسارات نمو مخصصة لك." },
          { icon: Shield, label: "حصن المعلومات", desc: "بياناتك مشفرة ومحمية بطلاسم الخصوصية العصرية." },
          { icon: Sparkles, label: "تطور مستمر", desc: "نظامنا يتعلم منك ليصبح رفيقك الأذكى مع كل معركة." }].
          map((item, i) =>
          <div key={i} className={STYLES.glass + " p-8 space-y-4 group hover:border-primary/50 transition-all"}>
                <div className="p-3 bg-white/5 rounded-2xl w-max group-hover:scale-110 transition-transform">
                   <item.icon className="w-8 h-8 text-primary" />
                </div>
                <h4 className="text-xl font-black text-white">{item.label}</h4>
                <p className="text-gray-500 font-medium leading-relaxed">{item.desc}</p>
             </div>
          )}
        </div>
      </div>
    </div>);

}
