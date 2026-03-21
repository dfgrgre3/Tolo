"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminStatsCard, AdminCard, AdminGridCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { TopPerformers } from "@/components/admin/dashboard/widgets";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, BookOpen, FileText, Trophy, Clock, Target, Activity, Zap, BarChart3, RefreshCw, Download, Filter, Move, Settings, Search, ArrowRight, MousePointerClick, TrendingUp, DollarSign, Wallet, Percent, PieChart, AlertTriangle
} from "lucide-react";
import dynamic from "next/dynamic";
import { AnalyticsSkeleton } from "@/components/admin/ui/loading-skeleton";
import { useQuery } from "@tanstack/react-query";
import { AiCommandCenter } from "@/components/admin/dashboard/ai-command-center";
import { motion, Reorder } from "framer-motion";
import { toast } from "sonner";

const DailyActiveUsersChart = dynamic(() => import('./charts').then(mod => mod.DailyActiveUsersChart), { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-xl" /> });
const DailyRegistrationsChart = dynamic(() => import('./charts').then(mod => mod.DailyRegistrationsChart), { ssr: false, loading: () => <div className="h-[300px] w-full animate-pulse bg-muted/50 rounded-xl" /> });
const RoleDistributionChart = dynamic(() => import('./charts').then(mod => mod.RoleDistributionChart), { ssr: false, loading: () => <div className="h-[200px] w-full animate-pulse bg-muted/50 rounded-xl" /> });

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = React.useState("month");
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [widgetOrder, setWidgetOrder] = React.useState(["users", "activity", "finance", "content"]);

  const { data, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: ['admin', 'analytics', period],
    queryFn: async () => {
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (!response.ok) throw new Error("Failed to fetch analytics data");
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000,
  });

  const saveLayout = () => {
    setIsEditMode(false);
    toast.success("تم حفظ تخطيط لوحة التحكم الخاص بك بنجاح!");
  };

  const roleLabels: Record<string, string> = {
    ADMIN: "مدير", TEACHER: "معلم", STUDENT: "طالب", MODERATOR: "مشرف"
  };

  if (loading && !data) return <AnalyticsSkeleton />;

  const roleChartData = Object.entries(data?.users?.byRole ?? {}).map(([role, count]) => ({
    name: roleLabels[role] || role,
    value: typeof count === "number" ? count : Number(count ?? 0),
  }));

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        title="التحليلات وذكاء الأعمال (BI)"
        description="لوحات معلومات مخصصة، تقارير مالية، وتتبع مسار المستخدمين لاستخلاص القرارات."
      >
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40 rounded-xl">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="week">آخر أسبوع</SelectItem>
              <SelectItem value="month">آخر شهر</SelectItem>
              <SelectItem value="year">آخر سنة</SelectItem>
            </SelectContent>
          </Select>
          <AdminButton variant="outline" size="sm" icon={Download} className="hidden md:flex">
            تصدير
          </AdminButton>
          <AdminButton variant="outline" size="sm" icon={RefreshCw} onClick={() => refetch()}>
            تحديث
          </AdminButton>
        </div>
      </PageHeader>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
          <TabsTrigger value="dashboard" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary">
             لوحتي المخصصة (Custom Widgets)
          </TabsTrigger>
          <TabsTrigger value="finance" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
             الماليات و Unit Economics
          </TabsTrigger>
          <TabsTrigger value="journey" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500">
             مسار المستخدمين (User Journey)
          </TabsTrigger>
        </TabsList>

        {/* ====================================
            TAB 1: DRAG & DROP DASHBOARDS
            ==================================== */}
        <TabsContent value="dashboard" className="space-y-6">
           <div className="flex justify-between items-center bg-accent/20 p-4 rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-primary/20 text-primary rounded-lg"><Settings className="w-5 h-5"/></div>
                 <div>
                    <h3 className="font-bold text-lg">وضع تخصيص اللوحة (Widget Builder)</h3>
                    <p className="text-xs text-muted-foreground">قم بترتيب وإخفاء/إظهار المكونات التي تهمك فقط.</p>
                 </div>
              </div>
              <div>
                 {!isEditMode ? (
                   <AdminButton onClick={() => setIsEditMode(true)} variant="outline" icon={Move}>تعديل التخطيط</AdminButton>
                 ) : (
                   <AdminButton onClick={saveLayout} variant="default" className="bg-primary text-white">حفظ التخطيط</AdminButton>
                 )}
              </div>
           </div>

           <AiCommandCenter />

           <Reorder.Group axis="y" values={widgetOrder} onReorder={setWidgetOrder} className="space-y-6">
              {widgetOrder.map((widgetBlock) => (
                 <Reorder.Item 
                    key={widgetBlock} 
                    value={widgetBlock} 
                    drag={isEditMode ? "y" : false}
                    className={`relative ${isEditMode ? "cursor-grab active:cursor-grabbing border-2 border-dashed border-primary/50 rounded-3xl p-2 bg-primary/5" : ""}`}
                 >
                    {isEditMode && (
                      <div className="absolute top-4 right-4 z-10 p-2 bg-background border border-border rounded-lg shadow-xl text-primary flex items-center gap-2 font-black">
                         <Move className="w-4 h-4" /> اسحب لتغيير الترتيب
                      </div>
                    )}

                    {widgetBlock === "users" && (
                       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                         <AdminStatsCard title="إجمالي المستخدمين" value={(data?.users?.total ?? 0).toLocaleString()} description={`${data?.users?.new ?? 0} مستخدم جديد`} icon={Users} color="blue" />
                         <AdminStatsCard title="التسجيلات النشطة" value={(data?.users?.active ?? 0).toLocaleString()} description="هذا الأسبوع" icon={Activity} color="green" />
                         <AdminStatsCard title="معدل الاحتفاظ" value="84%" description="زيادة 2% عن الشهر الماضي" icon={Target} color="purple" trend={{ value: 2, isPositive: true }} />
                         <AdminStatsCard title="التفاعل اليومي" value="12,500" description="جلسة دراسية" icon={Zap} color="yellow" />
                       </div>
                    )}

                    {widgetBlock === "activity" && (
                       <div className="grid gap-4 lg:grid-cols-2 mt-4">
                         <AdminGridCard title="المستخدمين النشطين يومياً" subtitle="عدد المستخدمين الذين سجلوا دخول" noPadding>
                           <DailyActiveUsersChart data={data?.charts?.dailyActiveUsers ?? []} />
                         </AdminGridCard>
                         <AdminGridCard title="التسجيلات الجديدة" subtitle="معدل النمو اليومي" noPadding>
                           <DailyRegistrationsChart data={data?.charts?.dailyRegistrations ?? []} />
                         </AdminGridCard>
                       </div>
                    )}

                    {widgetBlock === "content" && (
                       <div className="grid gap-4 lg:grid-cols-3 mt-4">
                         <AdminGridCard title="التوزيع الطلابي" noPadding>
                           <div className="p-4"><RoleDistributionChart data={roleChartData} /></div>
                         </AdminGridCard>
                         <AdminGridCard title="إحصائيات المحتوى">
                           <div className="space-y-4">
                             {[
                               { label: "المواد الدراسية", value: data?.content?.subjects ?? 0, icon: BookOpen },
                               { label: "الامتحانات", value: data?.content?.exams ?? 0, icon: Target },
                               { label: "المقالات", value: data?.content?.blogPosts ?? 0, icon: FileText },
                             ].map((item) => (
                               <div key={item.label} className="flex items-center justify-between">
                                 <div className="flex items-center gap-2"><item.icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{item.label}</span></div>
                                 <span className="font-medium">{item.value}</span>
                               </div>
                             ))}
                           </div>
                         </AdminGridCard>
                         <AdminGridCard title="إحصائيات البطولات">
                           <div className="space-y-4">
                             <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /><span className="text-sm">الأوسمة</span></div><span className="font-medium">{data?.gamification?.achievementsEarned ?? 0}</span></div>
                             <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Target className="h-4 w-4 text-green-500" /><span className="text-sm">التحديات</span></div><span className="font-medium">{data?.gamification?.challengesCompleted ?? 0}</span></div>
                             <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-500" /><span className="text-sm">XP الموزع</span></div><span className="font-medium">{(data?.gamification?.totalXP ?? 0).toLocaleString()}</span></div>
                           </div>
                         </AdminGridCard>
                       </div>
                    )}
                 </Reorder.Item>
              ))}
           </Reorder.Group>
        </TabsContent>

        {/* ====================================
            TAB 2: REGIONAL ECONOMICS (FINANCE)
            ==================================== */}
        <TabsContent value="finance" className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <AdminCard variant="glass" className="border-emerald-500/20 shadow-lg shadow-emerald-500/5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl"></div>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shrink-0"><DollarSign className="w-6 h-6"/></div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">القيمة الدائمة للطالب (LTV)</p>
                      <h3 className="text-3xl font-black mt-1 flex items-baseline gap-1">450 <span className="text-sm font-bold text-muted-foreground">ج.م</span></h3>
                      <p className="text-xs text-emerald-500 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> +12% عن الشهر الماضي</p>
                   </div>
                </div>
             </AdminCard>
             <AdminCard variant="glass" className="border-red-500/20 shadow-lg shadow-red-500/5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center shrink-0"><Users className="w-6 h-6"/></div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">تكلفة اكتساب العميل (CAC)</p>
                      <h3 className="text-3xl font-black mt-1 flex items-baseline gap-1">65 <span className="text-sm font-bold text-muted-foreground">ج.م</span></h3>
                      <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3"/> ارتفعت بسبب حملة الفيسبوك</p>
                   </div>
                </div>
             </AdminCard>
             <AdminCard variant="glass" className="border-blue-500/20 shadow-lg shadow-blue-500/5 relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
                <div className="flex gap-4">
                   <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center shrink-0"><Percent className="w-6 h-6"/></div>
                   <div>
                      <p className="text-sm font-bold text-muted-foreground">عائد الاستثمار التسويقي (ROI)</p>
                      <h3 className="text-3xl font-black mt-1 flex items-baseline gap-1">592 <span className="text-sm font-bold text-muted-foreground">%</span></h3>
                      <p className="text-xs text-blue-500 font-bold mt-2 flex items-center gap-1">استقرار ممتاز للميزانية</p>
                   </div>
                </div>
             </AdminCard>
           </div>

           <div className="grid lg:grid-cols-2 gap-6">
              <AdminCard variant="glass">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black flex items-center gap-2"><PieChart className="w-5 h-5 text-primary" /> تفصيل الأرباح حسب المادة</h3>
                 </div>
                 <div className="space-y-5">
                    {[
                      { name: "الفيزياء (مراجعة نهائية)", revenue: 45000, margin: 80 },
                      { name: "الكيمياء العضوية", revenue: 32000, margin: 65 },
                      { name: "اللغة الإنجليزية", revenue: 28000, margin: 90 },
                    ].map((item, i) => (
                      <div key={i} className="flex flex-col gap-2">
                         <div className="flex justify-between items-center text-sm font-bold">
                            <span>{item.name}</span>
                            <span className="text-primary">{item.revenue.toLocaleString()} ج.م</span>
                         </div>
                         <div className="w-full h-3 bg-secondary rounded-full overflow-hidden flex">
                            <div className="h-full bg-primary rounded-full relative" style={{ width: `${item.margin}%` }}></div>
                         </div>
                         <p className="text-[10px] text-muted-foreground font-black text-left">هامش الربح {item.margin}%</p>
                      </div>
                    ))}
                 </div>
              </AdminCard>

              <AdminCard variant="glass">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-black flex items-center gap-2"><Wallet className="w-5 h-5 text-amber-500" /> مستحقات المعلمين</h3>
                    <Select defaultValue="month">
                       <SelectTrigger className="w-32 h-8 text-xs rounded-lg"><SelectValue/></SelectTrigger>
                       <SelectContent><SelectItem value="month">هذا الشهر</SelectItem></SelectContent>
                    </Select>
                 </div>
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                       <thead>
                          <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase">
                             <th className="pb-3 px-2 font-bold">المعلم</th>
                             <th className="pb-3 px-2 font-bold">المبيعات</th>
                             <th className="pb-3 px-2 font-bold">العمولة</th>
                             <th className="pb-3 px-2 font-bold">الحالة</th>
                          </tr>
                       </thead>
                       <tbody>
                          {[
                             { name: "أ. محمود سالم", sales: 120, comission: 18000, status: "pending" },
                             { name: "أ. سعاد النمر", sales: 85, comission: 12750, status: "paid" },
                             { name: "أ. إبراهيم فؤاد", sales: 42, comission: 6300, status: "pending" },
                          ].map((t, i) => (
                             <tr key={i} className="border-b border-border/20 last:border-0 hover:bg-accent/10 transition-colors">
                                <td className="py-4 px-2 font-bold">{t.name}</td>
                                <td className="py-4 px-2">{t.sales} اشتراك</td>
                                <td className="py-4 px-2 font-black text-primary">{t.comission.toLocaleString()} ج.م</td>
                                <td className="py-4 px-2">
                                   <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase ${t.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                      {t.status === 'paid' ? 'تم الدفع' : 'مستحق'}
                                   </span>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </AdminCard>
           </div>
        </TabsContent>

        {/* ====================================
            TAB 3: USER JOURNEY MAPPING
            ==================================== */}
        <TabsContent value="journey" className="space-y-6">
           <AdminCard variant="glass" className="bg-gradient-to-br from-purple-500/5 to-transparent border-purple-500/20">
              <div className="flex items-center justify-between mb-6">
                 <div>
                    <h3 className="text-2xl font-black flex items-center gap-3 text-purple-500">
                       <MousePointerClick className="w-6 h-6" /> خريطة مسار المستخدم (Funnel & Journey Mapping)
                    </h3>
                    <p className="text-muted-foreground mt-2 font-medium">تتبع مسار الطالب منذ دخول المنصة وحتى الشراء أو إكمال الكورس لاكتشاف نقاط الاختناق (Drop-offs).</p>
                 </div>
                 <div className="flex gap-2">
                    <Select defaultValue="course_a">
                       <SelectTrigger className="w-64 h-11 bg-background"><SelectValue placeholder="اختر مسار لتتبعه"/></SelectTrigger>
                       <SelectContent>
                          <SelectItem value="course_a">مسار التوجيهي علمي (شراء كورس)</SelectItem>
                          <SelectItem value="register">مسار التسجيل الجديد وتفعيل الحساب</SelectItem>
                       </SelectContent>
                    </Select>
                 </div>
              </div>

              {/* Advanced Funnel UI */}
              <div className="mt-12 mb-8 relative px-4 md:px-12">
                 <div className="absolute top-1/2 left-0 w-full h-1 bg-gradient-to-l from-primary via-purple-500 to-red-500 -translate-y-1/2 -z-10 rounded-full opacity-30 hidden md:block"></div>
                 <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {[
                      { step: 1, name: "زيارة الصفحة الرئيسية", users: 15400, percent: "100%", drop: null },
                      { step: 2, name: "تصفح صفحة المواد", users: 8900, percent: "57.7%", drop: "-42.3%" },
                      { step: 3, name: "الوصول لصفحة الدفع", users: 2100, percent: "13.6%", drop: "-76.4%", danger: true },
                      { step: 4, name: "إتمام الشراء", users: 950, percent: "6.1%", drop: "-54.7%" },
                    ].map((s, i) => (
                      <div key={i} className="flex flex-col items-center text-center relative">
                         <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-xl mb-4 border ${s.danger ? 'bg-red-500 text-white border-red-400 shadow-red-500/30' : 'bg-card text-foreground border-border shadow-black/10'}`}>
                            {s.step}
                         </div>
                         <h4 className="font-bold mb-1">{s.name}</h4>
                         <p className="text-2xl font-black text-primary">{s.users.toLocaleString()}</p>
                         <p className="text-xs font-bold text-muted-foreground">{s.percent} من الأصلي</p>
                         
                         {s.drop && (
                            <div className={`mt-3 px-3 py-1 rounded-full text-xs font-bold w-fit mx-auto ${s.danger ? 'bg-red-500/20 text-red-500 ring-2 ring-red-500/50' : 'bg-muted text-muted-foreground'}`}>
                               سقوط {s.drop}
                            </div>
                         )}

                         {s.danger && (
                            <div className="absolute -top-10 scale-90 w-max bg-red-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-xl animate-bounce">
                               نقطة اختناق خطيرة! ⚠️
                               <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45"></div>
                            </div>
                         )}
                      </div>
                    ))}
                 </div>
              </div>
           </AdminCard>

           <div className="grid md:grid-cols-2 gap-6">
              <AdminCard variant="glass">
                 <h3 className="text-lg font-black mb-4 flex items-center gap-2"><Search className="w-5 h-5 text-blue-500"/> أكثر الصفحات تعقيداً للطلاب</h3>
                 <div className="space-y-3">
                    {[
                      { path: "/checkout/payment", avgTime: "4:32", bounce: "72%", issue: "خيارات دفع معقدة" },
                      { path: "/exams/physics-midterm", avgTime: "0:45", bounce: "45%", issue: "لا يجدون زر البدء" },
                      { path: "/auth/register", avgTime: "2:10", bounce: "31%", issue: "طول نموذج التسجيل" },
                    ].map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-accent/20 rounded-lg border border-border/50">
                         <div>
                            <p className="text-sm font-bold dir-ltr text-left font-mono">{p.path}</p>
                            <p className="text-xs text-red-500 font-bold mt-1">السبب التلقائي: {p.issue}</p>
                         </div>
                         <div className="text-left">
                            <p className="text-xs text-muted-foreground font-bold">بقاء {p.avgTime}د</p>
                            <p className="text-xs font-black bg-red-500/10 text-red-500 px-2 rounded mt-1">ارتداد {p.bounce}</p>
                         </div>
                      </div>
                    ))}
                 </div>
              </AdminCard>
              <AdminCard variant="glass">
                 <h3 className="text-lg font-black mb-4 flex items-center gap-2"><ArrowRight className="w-5 h-5 text-emerald-500"/> مسارات النجاح الشائعة (Happy Paths)</h3>
                 <div className="space-y-4">
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                       <p className="text-sm font-bold mb-2">كيف يشتري 60% من الطلاب؟</p>
                       <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground overflow-x-auto pb-2 whitespace-nowrap">
                          <span className="bg-background px-2 py-1 rounded border">الفيسبوك</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-background px-2 py-1 rounded border">المدونة المجانية</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-background px-2 py-1 rounded border border-emerald-500 text-emerald-500">شراء الباقة الشاملة</span>
                       </div>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                       <p className="text-sm font-bold mb-2">مسار الاجتهاد والتفوق</p>
                       <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground overflow-x-auto pb-2 whitespace-nowrap">
                          <span className="bg-background px-2 py-1 rounded border">الاختبار اليومي</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-background px-2 py-1 rounded border">رؤية الترتيب</span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="bg-background px-2 py-1 rounded border border-emerald-500 text-emerald-500">حضور اللايف مباشرة</span>
                       </div>
                    </div>
                 </div>
              </AdminCard>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
