"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { m, AnimatePresence } from "framer-motion";
import {
   ShieldAlert, Target, Eye, Focus, RefreshCw, XCircle, Radio,
   Smartphone, Monitor, KeyRound, ShieldHalf, UserCog, Lock, AlertTriangle, Fingerprint, Ban, CheckCircle2
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { toast } from "sonner";
import { apiRoutes } from "@/lib/api/routes";

interface ActiveUser {
   userId: string;
   user: {
      id: string;
      name: string;
      email: string;
      role: string;
      avatar: string | null;
   };
   sessionId: string | null;
   lastAccessed: string;
   ip: string | null;
   deviceInfo: string | null;
   isActive: boolean;
   currentActivity: 'online' | 'studying' | 'taking_exam';
   activityDetails: {
      type: string;
      subject?: { id: string; name: string; nameAr: string };
      exam?: { id: string; title: string; subject: { name: string; nameAr: string } };
      startTime?: string;
      takenAt?: string;
      duration?: number;
      score?: number;
   } | null;
}

interface LiveStats {
   totalActive: number;
   studying: number;
   takingExam: number;
   online: number;
   byRole: {
      students: number;
      teachers: number;
      admins: number;
   };
}

export default function LiveMonitoringPage() {
   const { fetchWithAuth } = useAuth();
   const [activeUsers, setActiveUsers] = React.useState<ActiveUser[]>([]);
   const [stats, setStats] = React.useState<LiveStats | null>(null);
   const [loading, setLoading] = React.useState(true);
   const [error, setError] = React.useState<string | null>(null);
   const [filter, setFilter] = React.useState<'all' | 'exam' | 'study' | 'online'>('all');
   const [autoRefresh, setAutoRefresh] = React.useState(true);

   const fetchLiveData = React.useCallback(async () => {
      try {
         setLoading(true);
         const response = await fetchWithAuth(`${apiRoutes.admin.live}?type=${filter}&minutes=5`);
         if (!response.ok) {
            throw new Error('Failed to fetch live data');
         }
         const data = await response.json();
         if (data.success) {
            setActiveUsers(data.activeUsers || []);
            setStats(data.stats || null);
            setError(null);
         } else {
            throw new Error(data.error || 'Unknown error');
         }
      } catch (err: any) {
         setError(err.message || 'Failed to fetch live data');
         toast.error('فشل في جلب بيانات المراقبة الحية');
      } finally {
         setLoading(false);
      }
   }, [filter, fetchWithAuth]);

   // Initial fetch and auto-refresh
   React.useEffect(() => {
      fetchLiveData();

      let interval: NodeJS.Timeout | null = null;
      if (autoRefresh) {
         interval = setInterval(fetchLiveData, 30000); // Refresh every 30 seconds
      }

      return () => {
         if (interval) clearInterval(interval);
      };
   }, [fetchLiveData, autoRefresh]);

   const handleRefresh = () => {
      fetchLiveData();
      toast.success('تم تحديث البيانات');
   };

   const handleTerminateSession = async (sessionId: string) => {
      if (!confirm('هل أنت متأكد من إنهاء هذه الجلسة؟')) return;

      try {
         const response = await fetchWithAuth(`${apiRoutes.auth.sessions}?id=${sessionId}`, {
            method: 'DELETE',
         });
         if (response.ok) {
            toast.success('تم إنهاء الجلسة بنجاح');
            fetchLiveData();
         } else {
            throw new Error('Failed to terminate session');
         }
      } catch (err) {
         toast.error('فشل في إنهاء الجلسة');
      }
   };

   // Filter users based on selected tab
   const filteredUsers = React.useMemo(() => {
      if (filter === 'all') return activeUsers;
      return activeUsers.filter(u => {
         if (filter === 'exam') return u.currentActivity === 'taking_exam';
         if (filter === 'study') return u.currentActivity === 'studying';
         if (filter === 'online') return u.currentActivity === 'online';
         return true;
      });
   }, [activeUsers, filter]);

   return (
      <div className="space-y-6 pb-20">
         <PageHeader
            title="مركز المراقبة والآمان (Security Hub)"
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

         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
               <span className="text-sm font-bold">تحديث تلقائي (كل 30 ثانية)</span>
            </div>
            <AdminButton variant="outline" onClick={handleRefresh} disabled={loading}>
               <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
               تحديث الآن
            </AdminButton>
         </div>

         {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-500 font-bold">
               خطأ: {error}
            </div>
         )}

         <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
            <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
               <TabsTrigger value="all" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
                  <Radio className="w-4 h-4 ml-2" /> الكل ({stats?.totalActive || 0})
               </TabsTrigger>
               <TabsTrigger value="exam" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-red-500/10 data-[state=active]:text-red-500">
                  <Focus className="w-4 h-4 ml-2" /> الامتحانات ({stats?.takingExam || 0})
               </TabsTrigger>
               <TabsTrigger value="study" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-green-500/10 data-[state=active]:text-green-500">
                  <Eye className="w-4 h-4 ml-2" /> الدراسة ({stats?.studying || 0})
               </TabsTrigger>
               <TabsTrigger value="online" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-500">
                  <Target className="w-4 h-4 ml-2" /> المتصلون ({stats?.online || 0})
               </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="space-y-6">
               {loading && activeUsers.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground font-bold">جاري تحميل بيانات المراقبة...</div>
               ) : (
                  <>
                     <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
                        <AdminCard variant="glass" className="p-6 flex items-center justify-between border-blue-500/20">
                           <div>
                              <p className="text-sm text-muted-foreground font-bold mb-1">إجمالي المستخدمين النشطين</p>
                              <h3 className="text-4xl font-black">{stats?.totalActive || 0}</h3>
                           </div>
                           <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><Target className="w-8 h-8" /></div>
                        </AdminCard>
                        <AdminCard variant="glass" className="p-6 flex items-center justify-between border-orange-500/20">
                           <div>
                              <p className="text-sm text-muted-foreground font-bold mb-1">الطلاب يدرسون حالياً</p>
                              <h3 className="text-4xl font-black text-orange-500">{stats?.studying || 0}</h3>
                           </div>
                           <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-500"><Eye className="w-8 h-8" /></div>
                        </AdminCard>
                        <AdminCard variant="glass" className="p-6 flex items-center justify-between border-red-500/20">
                           <div>
                              <p className="text-sm text-muted-foreground font-bold mb-1">الطلاب يؤدون امتحانات</p>
                              <h3 className="text-4xl font-black text-red-500">{stats?.takingExam || 0}</h3>
                           </div>
                           <div className="p-4 bg-red-500/10 rounded-2xl text-red-500"><Focus className="w-8 h-8" /></div>
                        </AdminCard>
                     </div>

                     <AdminCard variant="glass" className="p-0 overflow-hidden">
                        <div className="p-6 border-b border-border bg-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                           <div>
                              <h2 className="text-xl font-black flex items-center gap-2">
                                 <Focus className="w-5 h-5 text-red-500" /> رادار النشاط الحي (Live Activity Radar)
                              </h2>
                              <p className="text-sm text-muted-foreground mt-1">يتم عرض المستخدمين النشطين في آخر 5 دقائق.</p>
                           </div>
                           <div className="flex gap-2">
                              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                                 <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                                 <SelectContent>
                                    <SelectItem value="all">الكل</SelectItem>
                                    <SelectItem value="exam">الامتحانات</SelectItem>
                                    <SelectItem value="study">الدراسة</SelectItem>
                                    <SelectItem value="online">المتصلون</SelectItem>
                                 </SelectContent>
                              </Select>
                           </div>
                        </div>

                        <div className="p-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                           <AnimatePresence>
                              {filteredUsers.length === 0 ? (
                                 <div className="col-span-full text-center py-10 text-muted-foreground font-bold">
                                    لا يوجد مستخدمين نشطين حالياً
                                 </div>
                              ) : (
                                 filteredUsers.map((user) => (
                                    <m.div
                                       key={user.userId}
                                       layout
                                       initial={{ opacity: 0, scale: 0.9 }}
                                       animate={{ opacity: 1, scale: 1 }}
                                       exit={{ opacity: 0 }}
                                    >
                                       <div className={`p-5 rounded-3xl relative overflow-hidden border-2 transition-all duration-300 ${user.currentActivity === 'taking_exam'
                                             ? 'border-red-500 bg-red-500/5 shadow-[0_0_20px_rgba(239,68,68,0.3)]'
                                             : user.currentActivity === 'studying'
                                                ? 'border-green-500/50 bg-green-500/5'
                                                : 'bg-card border-border'
                                          }`}>
                                          <div className="flex justify-between items-start gap-3">
                                             <div className="flex items-center gap-3">
                                                <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                                                   <AvatarFallback className="font-bold bg-primary/10 text-primary">
                                                      {user.user.name?.substring(0, 2) || '??'}
                                                   </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                   <h4 className={`font-bold text-sm ${user.currentActivity === 'taking_exam' ? 'text-red-500' : ''
                                                      }`}>{user.user.name}</h4>
                                                   <span className="text-[11px] text-muted-foreground font-medium">
                                                      {user.user.role === 'STUDENT' ? 'طالب' :
                                                         user.user.role === 'TEACHER' ? 'معلم' : 'إداري'}
                                                   </span>
                                                </div>
                                             </div>
                                             {user.currentActivity === 'taking_exam' && (
                                                <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-500 font-bold">
                                                   <AlertTriangle className="w-4 h-4" />
                                                </div>
                                             )}
                                          </div>

                                          {user.activityDetails && (
                                             <div className="mt-4 space-y-1">
                                                <div className="text-[10px] font-bold flex items-center gap-1 text-muted-foreground">
                                                   {user.currentActivity === 'taking_exam' ? (
                                                      <>
                                                         <Focus className="w-3 h-3 text-red-500" />
                                                         يؤدي امتحان: {user.activityDetails.exam?.title || 'امتحان'}
                                                      </>
                                                   ) : user.currentActivity === 'studying' ? (
                                                      <>
                                                         <Eye className="w-3 h-3 text-green-500" />
                                                         يدرس: {user.activityDetails.subject?.nameAr || user.activityDetails.subject?.name || 'مادة'}
                                                      </>
                                                   ) : (
                                                      <>
                                                         <Target className="w-3 h-3 text-blue-500" />
                                                         متصل
                                                      </>
                                                   )}
                                                </div>
                                                {user.currentActivity === 'studying' && user.activityDetails.duration && (
                                                   <div className="mt-2">
                                                      <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                                         <span>مدة الدراسة</span>
                                                         <span>{user.activityDetails.duration} دقيقة</span>
                                                      </div>
                                                   </div>
                                                )}
                                                {user.currentActivity === 'taking_exam' && user.activityDetails.score !== undefined && (
                                                   <div className="mt-2">
                                                      <div className="flex justify-between text-xs font-bold text-muted-foreground">
                                                         <span>الدرجة</span>
                                                         <span>{user.activityDetails.score}%</span>
                                                      </div>
                                                   </div>
                                                )}
                                             </div>
                                          )}

                                          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-2">
                                             {user.sessionId && (
                                                <AdminButton
                                                   variant="outline"
                                                   className="h-8 text-[10px] border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white"
                                                   onClick={() => handleTerminateSession(user.sessionId!)}
                                                >
                                                   إنهاء الجلسة
                                                </AdminButton>
                                             )}
                                             <AdminButton variant="outline" className="h-8 text-[10px]">
                                                مراسلة
                                             </AdminButton>
                                          </div>
                                       </div>
                                    </m.div>
                                 ))
                              )}
                           </AnimatePresence>
                        </div>
                     </AdminCard>
                  </>
               )}
            </TabsContent>
         </Tabs>

         {/* Other tabs (fingerprint, RBAC) remain as static for now */}
         <Tabs defaultValue="fingerprint" className="w-full">
            <TabsList className="w-full bg-background/50 h-14 p-1 border-border rounded-xl mb-6">
               <TabsTrigger value="fingerprint" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-500">
                  <Fingerprint className="w-4 h-4 ml-2" /> بصمة الأجهزة (Device Fingerprint)
               </TabsTrigger>
               <TabsTrigger value="rbac" className="w-full h-full text-base font-bold rounded-lg data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-500">
                  <UserCog className="w-4 h-4 ml-2" /> الأدوار الوظيفية (Granular RBAC)
               </TabsTrigger>
            </TabsList>

            <TabsContent value="fingerprint" className="space-y-6">
               {/* Keep existing static content for fingerprint tab */}
               <AdminCard variant="glass" className="bg-gradient-to-l from-blue-500/10 to-transparent border-blue-500/30">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-2xl font-black text-blue-500 flex items-center gap-2"><Fingerprint /> إدارة بصمة الأجهزة (Device Fingerprinting)</h3>
                        <p className="text-sm font-bold mt-2 max-w-2xl text-muted-foreground">يمنع هذا المحرك مشاركة الحسابات باستخدام تقنيات مطابقة معلومات المتصفح، الـ IP، والموقع الجغرافي. إذا تم رصد أجهزة متناقضة تعمل في نفس الوقت، سيتم اتخاذ إجراء تلقائي.</p>
                     </div>
                  </div>
               </AdminCard>
            </TabsContent>

            <TabsContent value="rbac" className="space-y-6">
               {/* Keep existing static content for RBAC tab */}
               <AdminCard variant="glass" className="bg-gradient-to-l from-emerald-500/10 to-transparent border-emerald-500/30">
                  <div className="flex justify-between items-start">
                     <div>
                        <h3 className="text-2xl font-black text-emerald-500 flex items-center gap-2"><KeyRound /> الصلاحيات الجزئية (Granular RBAC)</h3>
                        <p className="text-sm font-bold mt-2 max-w-2xl text-muted-foreground">صناعة وتخصيص أدوار دقيقة للموظفين والمعلمين. لا تعطى الصلاحية الكاملة لأحد. حدد من يقرأ، ومن يضيف، ومن يمسح، ومن يعدل الأسعار.</p>
                     </div>
                  </div>
               </AdminCard>
            </TabsContent>
         </Tabs>
      </div>
   );
}
