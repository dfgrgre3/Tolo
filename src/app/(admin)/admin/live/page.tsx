"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard, AdminStatsCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert, Target, Activity, Eye, Focus, RefreshCw, XCircle, Radio, MapPin, 
  Smartphone, Monitor, KeyRound, ShieldHalf, UserCog, Lock, AlertTriangle, Fingerprint, Ban, CheckCircle2
} from "lucide-react";

// Types
type ActivityType = "TAKING_EXAM" | "IDLE" | "SUSPICIOUS";

interface ExamStudent {
  id: string;
  name: string;
  examName: string;
  progress: number;
  warnings: number;
  isFocused: boolean;
  infractions: string[];
}

export default function SecurityOperationsPage() {
  const [pulse, setPulse] = React.useState(false);
  const [examTakers, setExamTakers] = React.useState<ExamStudent[]>([
    { id: "e1", name: "أحمد محمود", examName: "اختبار الفيزياء الموحد", progress: 45, warnings: 0, isFocused: true, infractions: [] },
    { id: "e2", name: "مريم حسن", examName: "اختبار الفيزياء الموحد", progress: 80, warnings: 1, isFocused: true, infractions: ["تبديل التبويب (Tab switch) لمدة 5 ثواني"] },
    { id: "e3", name: "زياد طارق", examName: "امتحان شامل كيمياء", progress: 20, warnings: 3, isFocused: false, infractions: ["تم فصل الإنترنت", "محاولة نسخ نص", "فتح تبويب جديد"] },
    { id: "e4", name: "فاطمة الزهراء", examName: "امتحان الأحياء النهائي", progress: 95, warnings: 0, isFocused: true, infractions: [] },
  ]);

  // Simulation effect for the radar
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
      setExamTakers(prev => prev.map(student => {
        if (student.id === "e1") {
          return { ...student, progress: Math.min(100, student.progress + 1) };
        }
        return student;
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const activeCheaters = examTakers.filter(e => !e.isFocused || e.warnings > 1).length;

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="مركز المراقبة والأمان (Security Hub)"
        description="نظام المراقبة الحية للامتحانات، تتبع الأجهزة، وإدارة الصلاحيات المتقدمة (RBAC)."
      >
        <div className="flex items-center gap-4 bg-background px-4 py-2 rounded-xl border shadow-sm">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </div>
          <span className="text-sm font-bold tracking-widest uppercase text-red-500">Anti-Cheat Active</span>
        </div>
      </PageHeader>

      <Tabs defaultValue="proctoring" className="w-full">
        <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
          <TabsTrigger value="proctoring" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">
             <Radio className="w-4 h-4 ml-2" /> المراقبة الحية (Live Proctoring)
          </TabsTrigger>
          <TabsTrigger value="fingerprint" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
             <Fingerprint className="w-4 h-4 ml-2" /> بصمة الأجهزة (Device Fingerprint)
          </TabsTrigger>
          <TabsTrigger value="rbac" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
             <UserCog className="w-4 h-4 ml-2" /> الأدوار الوظيفية (Granular RBAC)
          </TabsTrigger>
        </TabsList>

        {/* ====================================
            TAB 1: LIVE PROCTORING & RADAR
            ==================================== */}
        <TabsContent value="proctoring" className="space-y-6">
           <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
             <AdminCard variant="glass" className="p-6 flex items-center justify-between border-blue-500/20">
                <div>
                  <p className="text-sm text-muted-foreground font-bold mb-1">إجمالي المُمتحنين الآن</p>
                  <h3 className="text-4xl font-black">{examTakers.length + 152}</h3>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><Target className="w-8 h-8" /></div>
             </AdminCard>
             <AdminCard variant="glass" className="p-6 flex items-center justify-between border-orange-500/20">
                <div>
                  <p className="text-sm text-muted-foreground font-bold mb-1">التبويبات المبدلة (اليوم)</p>
                  <h3 className="text-4xl font-black text-orange-500">24</h3>
                </div>
                <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500"><Eye className="w-8 h-8" /></div>
             </AdminCard>
             <motion.div animate={{ scale: activeCheaters > 0 && pulse ? 1.02 : 1 }} transition={{ duration: 0.2 }}>
               <AdminCard variant="glass" className={`p-6 flex items-center justify-between border-2 ${activeCheaters > 0 ? 'bg-red-500/5 border-red-500/50' : ''}`}>
                  <div>
                    <p className="text-sm text-muted-foreground font-bold mb-1">حالات غش حرجة للتعامل</p>
                    <h3 className="text-4xl font-black text-red-500">{activeCheaters}</h3>
                  </div>
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-500"><ShieldAlert className="w-8 h-8" /></div>
               </AdminCard>
             </motion.div>
           </div>

           <AdminCard variant="glass" className="p-0 overflow-hidden">
              <div className="p-6 border-b border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                 <div>
                    <h2 className="text-xl font-black flex items-center gap-2"><Focus className="w-5 h-5 text-red-500" /> رادار الغش الذكي (Live Cheating Radar)</h2>
                    <p className="text-sm text-muted-foreground mt-1">يتم الكشف عن: الخروج من الشاشة، محاولات النسخ واللصق، انقطاع الاتصال المفتعل.</p>
                 </div>
                 <div className="flex gap-2">
                    <Select defaultValue="all"><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">كل الامتحانات</SelectItem><SelectItem value="physics">الفيزياء</SelectItem></SelectContent></Select>
                    <AdminButton variant="outline"><RefreshCw className="w-4 h-4 ml-2"/> تحدث الرادار</AdminButton>
                 </div>
              </div>

              <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                 <AnimatePresence>
                   {examTakers.map((student) => (
                      <motion.div key={student.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                        <div className={`p-5 rounded-3xl relative overflow-hidden border-2 transition-all duration-300 ${!student.isFocused ? 'border-red-500 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : student.warnings > 0 ? 'border-orange-500/50 bg-orange-500/5' : 'bg-card border-border'}`}>
                          {!student.isFocused && (
                            <div className="absolute top-0 left-0 right-0 bg-red-500 text-white text-[10px] font-black uppercase text-center py-1 tracking-widest flex items-center justify-center gap-2 animate-pulse">
                              <XCircle className="w-3 h-3" /> خارج شاشة الاختبار حالياً!
                            </div>
                          )}
                          <div className={`flex justify-between items-start gap-3 ${!student.isFocused ? 'mt-4' : ''}`}>
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12 border-2 border-background shadow-sm"><AvatarFallback className="font-bold bg-primary/10 text-primary">{student.name.substring(0,2)}</AvatarFallback></Avatar>
                              <div>
                                <h4 className={`font-bold text-sm ${!student.isFocused ? 'text-red-500' : ''}`}>{student.name}</h4>
                                <span className="text-[11px] text-muted-foreground font-medium">{student.examName}</span>
                              </div>
                            </div>
                            {student.warnings > 0 && (
                              <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-500 font-bold">
                                {student.warnings}
                              </div>
                            )}
                          </div>
                          
                          {student.infractions.length > 0 && (
                            <div className="mt-4 space-y-1">
                               {student.infractions.map((inf, i) => (
                                 <div key={i} className="text-[10px] font-bold flex items-center gap-1 text-orange-500 bg-orange-500/10 px-2 py-1 rounded">
                                    <AlertTriangle className="w-3 h-3" /> {inf}
                                 </div>
                               ))}
                            </div>
                          )}

                          <div className="mt-5 space-y-2">
                             <div className="flex justify-between text-xs font-bold text-muted-foreground"><span>مدى الإنجاز</span><span>{Math.round(student.progress)}%</span></div>
                             <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                                <motion.div className="bg-primary h-full" initial={{ width: 0 }} animate={{ width: `${student.progress}%` }} />
                             </div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-2">
                             <AdminButton variant="outline" className="h-8 text-[10px] border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white" disabled={student.warnings === 0}>طرد من الاختبار</AdminButton>
                             <AdminButton variant="outline" className="h-8 text-[10px]">مراسلة ومراقبة</AdminButton>
                          </div>
                        </div>
                      </motion.div>
                   ))}
                 </AnimatePresence>
              </div>
           </AdminCard>
        </TabsContent>

        {/* ====================================
            TAB 2: DEVICE FINGERPRINTING
            ==================================== */}
        <TabsContent value="fingerprint" className="space-y-6">
           <AdminCard variant="glass" className="bg-gradient-to-l from-blue-500/10 to-transparent border-blue-500/30">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-2xl font-black text-blue-500 flex items-center gap-2"><Fingerprint /> إدارة بصمة الأجهزة (Device Fingerprinting)</h3>
                    <p className="text-sm font-bold mt-2 max-w-2xl text-muted-foreground">يمنع هذا المحرك مشاركة الحسابات باستخدام تقنيات مطابقة معلومات المتصفح، الـ IP، والموقع الجغرافي. إذا تم رصد أجهزة متناقضة تعمل في نفس الوقت، سيتم اتخاذ إجراء تلقائي.</p>
                 </div>
                 <div className="bg-background rounded-2xl p-4 border border-border shadow-lg text-center min-w-[150px]">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">حسابات تم إيقافها هذا الشهر</p>
                    <h4 className="text-3xl font-black text-blue-500 mt-1">42</h4>
                 </div>
              </div>
           </AdminCard>

           <div className="grid md:grid-cols-2 gap-6">
              <AdminCard variant="glass">
                 <h4 className="text-lg font-black mb-6 flex items-center gap-2"><ShieldHalf /> قواعد مكافحة مشاركة الحسابات</h4>
                 <div className="space-y-6">
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="font-bold">المطابقة الجغرافية الصارمة</p>
                          <p className="text-xs text-muted-foreground mt-1">إيقاف الحساب فوراً إذا تم تسجيل الدخول من مدينتين مختلفتين في فترة تقل عن 3 ساعات.</p>
                       </div>
                       <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="font-bold">منع تعدد المتصفحات (Concurrent Logins)</p>
                          <p className="text-xs text-muted-foreground mt-1">إذا تم الدخول من متصفح ثاني، يتم طرد المتصفح الأول فوراً.</p>
                       </div>
                       <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                       <div>
                          <p className="font-bold">حظر برامج محاكي الأندرويد (BlueStacks)</p>
                          <p className="text-xs text-muted-foreground mt-1">يمنع تسجيل الدخول من محاكيات سطح المكتب التي تُستخدم غالباً لتسجيل الشاشة.</p>
                       </div>
                       <Switch defaultChecked />
                    </div>
                    <div className="bg-accent/30 p-4 rounded-xl border border-border mt-4">
                       <p className="font-bold text-sm mb-2">أقصى عدد للأجهزة المسجلة للطالب الواحد</p>
                       <Select defaultValue="2">
                          <SelectTrigger className="w-full bg-background"><SelectValue/></SelectTrigger>
                          <SelectContent><SelectItem value="1">جهاز واحد فقط (مشدد)</SelectItem><SelectItem value="2">جهازين (كمبيوتر + موبايل)</SelectItem><SelectItem value="3">3 أجهزة (مرن)</SelectItem></SelectContent>
                       </Select>
                    </div>
                 </div>
              </AdminCard>

              <AdminCard variant="glass">
                 <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-black flex items-center gap-2"><Ban className="text-red-500"/> رادار المخالفات الأخير</h4>
                    <span className="text-xs font-bold text-muted-foreground px-2 py-1 bg-accent rounded">آخر 24 ساعة</span>
                 </div>
                 <div className="space-y-4">
                    {[
                      { user: "يوسف ابراهيم", email: "yousef@gmail.com", device1: "iPhone 14 (القاهرة)", device2: "Windows PC (الإسكندرية)", time: "منذ 10 دقائق", action: "تم قفل الحساب" },
                      { user: "رنا سعيد", email: "rana@yahoo.com", device1: "MacBook (الجيزة)", device2: "Android (الرياض)", time: "منذ ساعتين", action: "إنذار فقط (VPN محتمل)" },
                    ].map((log, i) => (
                       <div key={i} className="p-4 rounded-2xl bg-background border border-border/50 relative overflow-hidden">
                          <div className={`absolute top-0 right-0 w-2 h-full ${log.action.includes('قفل') ? 'bg-red-500' : 'bg-orange-500'}`}></div>
                          <div className="flex justify-between items-start pr-4">
                             <div>
                                <p className="font-bold text-sm">{log.user} <span className="text-[10px] text-muted-foreground font-normal">({log.email})</span></p>
                                <div className="mt-2 text-xs font-bold text-muted-foreground flex items-center gap-2">
                                   <Smartphone className="w-3 h-3 text-primary"/> الدخول 1: {log.device1}
                                </div>
                                <div className="mt-1 text-xs font-bold text-muted-foreground flex items-center gap-2">
                                   <Monitor className="w-3 h-3 text-red-500"/> الدخول 2: {log.device2}
                                </div>
                             </div>
                             <div className="text-left">
                                <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">{log.time}</p>
                                <p className={`text-[10px] font-black px-2 py-1 rounded inline-block ${log.action.includes('قفل') ? 'bg-red-500/10 text-red-500' : 'bg-orange-500/10 text-orange-500'}`}>{log.action}</p>
                             </div>
                          </div>
                          <div className="mt-3 pr-4 flex gap-2">
                             <AdminButton variant="outline" className="h-6 text-[10px] px-2 py-0">مراجعة</AdminButton>
                             {log.action.includes('قفل') && <AdminButton variant="outline" className="h-6 text-[10px] px-2 py-0 border-emerald-500/30 text-emerald-500">رفع الحظر مؤقتاً</AdminButton>}
                          </div>
                       </div>
                    ))}
                 </div>
              </AdminCard>
           </div>
        </TabsContent>

        {/* ====================================
            TAB 3: GRANULAR RBAC
            ==================================== */}
        <TabsContent value="rbac" className="space-y-6">
           <AdminCard variant="glass" className="bg-gradient-to-l from-emerald-500/10 to-transparent border-emerald-500/30">
              <div className="flex justify-between items-start">
                 <div>
                    <h3 className="text-2xl font-black text-emerald-500 flex items-center gap-2"><KeyRound /> الصلاحيات الجزيئية (Granular RBAC)</h3>
                    <p className="text-sm font-bold mt-2 max-w-2xl text-muted-foreground">صناعة وتخصيص أدوار دقيقة للموظفين والمعلمين. لا تعطِ الصلاحية الكاملة لأحد. حدد من يقرأ، ومن يضيف، ومن يمسح، ومن يعدل الأسعار.</p>
                 </div>
                 <AdminButton variant="default" className="bg-emerald-500 text-white font-bold hover:bg-emerald-600">
                    إنشاء دور وظيفي جديد
                 </AdminButton>
              </div>
           </AdminCard>

           <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                 <h4 className="text-sm font-black uppercase text-muted-foreground tracking-widest pl-2 mb-4">الأدوار الحالية</h4>
                 {[
                   { name: "مدير النظام (Admin)", users: 2, locked: true },
                   { name: "معلم مادة", users: 15, locked: true },
                   { name: "مصمم محتوى (عربي)", users: 4, locked: false, active: true },
                   { name: "محاسب / مالي", users: 1, locked: false },
                   { name: "خدمة عملاء مستوى 1", users: 8, locked: false },
                 ].map((role, i) => (
                   <div key={i} className={`p-4 rounded-xl flex items-center justify-between border cursor-pointer transition-colors ${role.active ? 'bg-primary/5 border-primary shadow-sm' : 'bg-background hover:bg-accent/50 border-border/50'}`}>
                      <div>
                         <p className={`font-bold text-sm flex items-center gap-2 ${role.locked ? 'text-primary' : ''}`}>
                            {role.name} {role.locked && <Lock className="w-3 h-3 opacity-50"/>}
                         </p>
                         <p className="text-[10px] font-bold text-muted-foreground mt-1">{role.users} موظف مشمول بالكادر</p>
                      </div>
                      {role.active && <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>}
                   </div>
                 ))}
              </div>

              <div className="lg:col-span-2 space-y-4">
                 <AdminCard variant="glass">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-border/50">
                       <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><UserCog className="w-6 h-6"/></div>
                          <div>
                             <h4 className="text-lg font-black">جاري تعديل: مصمم محتوى (عربي)</h4>
                             <p className="text-xs font-bold text-muted-foreground">دور مخصص تم إنشاؤه بواسطة الإدارة</p>
                          </div>
                       </div>
                       <div className="flex gap-2">
                          <AdminButton variant="outline" className="text-red-500 hover:bg-red-500 hover:text-white border-red-500/20">حذف الدور</AdminButton>
                          <AdminButton variant="default" className="bg-emerald-500 text-white hover:bg-emerald-600">حفظ الصلاحيات</AdminButton>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="grid md:grid-cols-2 gap-4">
                          <div>
                             <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-2">اسم الدور الوظيفي</p>
                             <Input defaultValue="مصمم محتوى (عربي)" className="font-bold bg-background" />
                          </div>
                          <div>
                             <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-2">المادة المسموح بها (قيد)</p>
                             <Select defaultValue="arabic">
                                <SelectTrigger className="font-bold bg-background"><SelectValue/></SelectTrigger>
                                <SelectContent><SelectItem value="all">كل المواد (بلا تحجيم)</SelectItem><SelectItem value="arabic">اللغة العربية فقط</SelectItem></SelectContent>
                             </Select>
                          </div>
                       </div>

                       <div>
                          <p className="font-bold text-xs uppercase tracking-widest text-muted-foreground mb-4">جدول الصلاحيات المعقد (Matrix)</p>
                          <div className="rounded-2xl border border-border overflow-hidden">
                             <table className="w-full text-right text-sm">
                                <thead className="bg-accent/50 text-xs text-muted-foreground">
                                   <tr>
                                      <th className="py-3 px-4 font-bold">القسم / الوحدة</th>
                                      <th className="py-3 px-4 font-bold text-center">عرض (Read)</th>
                                      <th className="py-3 px-4 font-bold text-center">إضافة (Create)</th>
                                      <th className="py-3 px-4 font-bold text-center">تعديل (Update)</th>
                                      <th className="py-3 px-4 font-bold text-center">حذف (Delete)</th>
                                   </tr>
                                </thead>
                                <tbody>
                                   {[
                                     { mod: "بنوك الأسئلة والامتحانات", r: true, c: true, u: true, d: false },
                                     { mod: "الكتب والمذكرات", r: true, c: true, u: false, d: false },
                                     { mod: "أسعار الكورسات والفواتير", r: false, c: false, u: false, d: false },
                                     { mod: "الإعدادات العامة", r: false, c: false, u: false, d: false },
                                     { mod: "شات وسؤال المعلم", r: true, c: false, u: true, d: false },
                                   ].map((m, i) => (
                                      <tr key={i} className="border-t border-border/50 hover:bg-accent/10">
                                         <td className="py-3 px-4 font-bold text-muted-foreground">{m.mod}</td>
                                         <td className="py-3 px-4 text-center"><Checkbox checked={m.r} /></td>
                                         <td className="py-3 px-4 text-center"><Checkbox checked={m.c} /></td>
                                         <td className="py-3 px-4 text-center"><Checkbox checked={m.u} /></td>
                                         <td className="py-3 px-4 text-center"><Checkbox checked={m.d} /></td>
                                      </tr>
                                   ))}
                                </tbody>
                             </table>
                          </div>
                       </div>
                    </div>
                 </AdminCard>
              </div>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Simple internal checkbox since we didn't import it from lucide/radix
function Checkbox({ checked }: { checked: boolean }) {
   if (checked) {
      return (
         <div className="inline-flex w-5 h-5 rounded bg-emerald-500 text-white items-center justify-center m-auto cursor-pointer">
            <CheckCircle2 className="w-3 h-3" />
         </div>
      );
   }
   return (
      <div className="inline-flex w-5 h-5 rounded border-2 border-muted-foreground/30 items-center justify-center m-auto cursor-pointer hover:border-emerald-500">
      </div>
   );
}
