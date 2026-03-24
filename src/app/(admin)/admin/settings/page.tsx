"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { AdminButton } from "@/components/admin/ui/admin-button";
import { AdminCard } from "@/components/admin/ui/admin-card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Globe,
  Mail,
  Phone,
  Share2,
  Gamepad2,
  Wrench,
  RefreshCw,
  Save,
  Download,
  AlertTriangle,
  Clock,
  Crown,
  Zap,
  Lock,
  Layout,
  Server,
  Users,
  Trophy,
  MessageCircle,
  Target,
  TrendingUp
} from "lucide-react";
import { SettingsSkeleton } from "@/components/admin/ui/loading-skeleton";
import { motion, AnimatePresence } from "framer-motion";

const settingsSchema = z.object({
  siteName: z.string().min(1, "اسم الموقع مطلوب"),
  siteDescription: z.string().min(1, "وصف الموقع مطلوب"),
  siteKeywords: z.string(),
  contactEmail: z.string().email("البريد غير صالح"),
  supportPhone: z.string().optional(),
  socialLinks: z.object({
    facebook: z.string().optional(),
    twitter: z.string().optional(),
    instagram: z.string().optional(),
    youtube: z.string().optional(),
  }),
  features: z.object({
    registration: z.boolean(),
    emailVerification: z.boolean(),
    gamification: z.boolean(),
    forum: z.boolean(),
    blog: z.boolean(),
    events: z.boolean(),
    aiAssistant: z.boolean(),
  }),
  gamification: z.object({
    xpPerTask: z.number().min(0),
    xpPerStudySession: z.number().min(0),
    xpPerExam: z.number().min(0),
    streakBonus: z.number().min(0),
  }),
  limits: z.object({
    maxUploadSize: z.number().min(1),
    maxStudySessionDuration: z.number().min(1),
    examTimeLimit: z.number().min(1),
  }),
  maintenance: z.object({
    enabled: z.boolean(),
    message: z.string(),
  }),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function AdminSettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);
  const [_lastSaved, setLastSaved] = React.useState<Date | null>(null);

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      siteName: "",
      siteDescription: "",
      siteKeywords: "",
      contactEmail: "",
      supportPhone: "",
      socialLinks: {},
      features: {
        registration: true,
        emailVerification: true,
        gamification: true,
        forum: true,
        blog: true,
        events: true,
        aiAssistant: true,
      },
      gamification: {
        xpPerTask: 10,
        xpPerStudySession: 5,
        xpPerExam: 20,
        streakBonus: 2,
      },
      limits: {
        maxUploadSize: 10,
        maxStudySessionDuration: 180,
        examTimeLimit: 60,
      },
      maintenance: {
        enabled: false,
        message: "",
      },
    },
  });

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings");
      const data = await response.json();
      const settings = data.settings;
      
      form.reset({
        ...settings,
        siteKeywords: settings.siteKeywords?.join(", ") || "",
      });
    } catch (_error) {
      toast.error("حدث خطأ أثناء جلب مرسوم الإعدادات");
    } finally {
      setLoading(false);
    }
  }, [form]);

  React.useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (values: SettingsFormValues) => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          siteKeywords: values.siteKeywords.split(",").map(k => k.trim()).filter(Boolean),
        }),
      });

      if (response.ok) {
        toast.success("تم ختم المرسوم وحفظ الإعدادات الملكية");
        setLastSaved(new Date());
        setHasChanges(false);
      } else {
        toast.error("فشل في ختم المرسوم");
      }
    } catch (_error) {
      toast.error("خطأ في الاتصال بالسيرفر الملكي");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      const response = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });

      if (response.ok) {
        const data = await response.json();
        form.reset({
          ...data.settings,
          siteKeywords: data.settings.siteKeywords?.join(", ") || "",
        });
        toast.success("تمت العودة للقيم الأساسية للمملكة");
      }
    } catch (_error) {
      toast.error("فشل في استعادة القيم الأصلية");
    }
  };

  const handleExportSettings = () => {
    const settings = form.getValues();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `kingdom-legacy-${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
    toast.success("تم تصدير نسخة من قوانين المملكة");
  };

  React.useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(form.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (loading) return <SettingsSkeleton />;

  return (
    <div className="space-y-10 pb-20" dir="rtl">
      <PageHeader
        title="قوانين وأعراف المملكة 📜"
        description="تعديل القوانين الأساسية، تفعيل المزايا السحرية، وإدارة شؤون الصيانة العامة."
      >
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {hasChanges && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black h-8 px-4 px-3 rounded-xl animate-pulse">
                  تعديلات غير مختومة ✒️
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
            <IconButton icon={Download} onClick={handleExportSettings} title="تصدير القوانين" />
            <IconButton icon={RefreshCw} onClick={handleReset} title="استعادة الجذور" />
            <div className="w-px h-6 bg-white/10 self-center mx-1" />
            <AdminButton 
              size="sm" 
              onClick={form.handleSubmit(handleSave)} 
              disabled={saving || !hasChanges} 
              className="h-9 px-6 rounded-xl font-black bg-primary/20 text-primary hover:bg-primary shadow-[0_0_20px_rgba(var(--primary),0.2)]"
            >
              <Save className="ml-2 h-4 w-4" />
              {saving ? "جاري الختم..." : "ختم المرسوم"}
            </AdminButton>
          </div>
        </div>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <Tabs defaultValue="general" className="space-y-10">
            <TabsList className="flex flex-wrap h-auto bg-card/50 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] gap-2 items-center justify-center">
              {[
                { value: "general", label: "الهوية العامة", icon: Globe, color: "blue" },
                { value: "features", label: "القوى والمزايا", icon: Zap, color: "amber" },
                { value: "gamification", label: "نظام التطور", icon: Gamepad2, color: "purple" },
                { value: "limits", label: "موازين القدرة", icon: Wrench, color: "emerald" },
                { value: "social", label: "روابط التواصل", icon: Share2, color: "pink" },
                { value: "maintenance", label: "مقر الإصلاح", icon: Server, color: "red" },
              ].map((tab) => (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value}
                  className="rounded-2xl h-11 px-6 data-[state=active]:bg-white/10 data-[state=active]:shadow-lg font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all border border-transparent data-[state=active]:border-white/10"
                >
                  <tab.icon className={`w-4 h-4 text-${tab.color}-500`} />
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="general" className="space-y-6 focus-visible:outline-none">
              <AdminCard variant="glass" className="p-8 space-y-8">
                <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                  <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                    <Globe className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">هوية المملكة الرقمية</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">تحديد الاسم، الوصف، والكلمات الدليلية للانتشار.</p>
                  </div>
                </div>

                <div className="grid gap-8">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسم المملكة الرسمي</FormLabel>
                        <FormControl><Input {...field} className="h-14 rounded-2xl border-white/10 bg-white/5 text-lg font-black px-6" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="siteDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">توصيف المملكة (Meta Description)</FormLabel>
                        <FormControl><Textarea {...field} className="rounded-2xl border-white/10 bg-white/5 min-h-[120px] p-6 text-sm font-bold" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid md:grid-cols-2 gap-8">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">الحمام الزاجل (البريد الرسمي)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input {...field} className="h-14 rounded-2xl border-white/10 bg-white/5 pr-12 dir-ltr text-center font-bold" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="supportPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">خط الاستدعاء (الدعم الفني)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input {...field} className="h-14 rounded-2xl border-white/10 bg-white/5 pr-12 dir-ltr text-center font-bold" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </AdminCard>
            </TabsContent>

            <TabsContent value="features" className="focus-visible:outline-none">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { key: "registration", label: "بوابة التجنيد", icon: Users, desc: "السماح بانضمام محاربين جدد للمملكة" },
                  { key: "emailVerification", label: "ختم التحقق", icon: Lock, desc: "طلب التأكد من هوية المحارب عبر البريد" },
                  { key: "gamification", label: "قوانين التطور", icon: Trophy, desc: "تفعيل نظام الـ XP والمستويات والبطولات" },
                  { key: "forum", label: "ميدان النقاش", icon: MessageCircle, desc: "تفعيل ساحات الحوار والتبادل العلمي" },
                  { key: "blog", label: "المكتبة الإخبارية", icon: Layout, desc: "تفعيل تدوينات القادة والمقالات التعليمية" },
                  { key: "aiAssistant", label: "المستشار الملكي (AI)", icon: Crown, desc: "تفعيل الذكاء الاصطناعي لمساعدة الطلاب" },
                ].map((feature) => (
                  <FormField
                    key={feature.key}
                    control={form.control}
                    name={`features.${feature.key}` as any}
                    render={({ field }) => (
                      <AdminCard variant="glass" className="p-6 transition-all hover:border-primary/30">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-4 items-center">
                            <div className="p-3 rounded-2xl bg-white/5 text-primary border border-white/10">
                              <feature.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <h4 className="font-black text-sm tracking-tight">{feature.label}</h4>
                              <p className="text-[10px] font-bold text-muted-foreground">{feature.desc}</p>
                            </div>
                          </div>
                          <Switch
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                            className="bg-white/10"
                          />
                        </div>
                      </AdminCard>
                    )}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="gamification" className="focus-visible:outline-none">
              <AdminCard variant="glass" className="p-8">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
                    <Gamepad2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">موازين الخبرة وتطوير الذات</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">تحديد نقاط الـ XP الممنوحة مقابل كل إنجاز يقوم به المحارب.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { key: "xpPerTask", label: "مبارزة (مهمة)", icon: Zap, color: "amber" },
                    { key: "xpPerStudySession", label: "خلوة علمية", icon: Clock, color: "blue" },
                    { key: "xpPerExam", label: "اختبار ملكي", icon: Target, color: "red" },
                    { key: "streakBonus", label: "مكافأة التتابع %", icon: TrendingUp, color: "emerald" },
                  ].map((field) => (
                    <FormField
                      key={field.key}
                      control={form.control}
                      name={`gamification.${field.key}` as any}
                      render={({ field: inputField }) => (
                        <FormItem className="text-center group">
                          <div className={`mx-auto p-4 rounded-3xl bg-${field.color}-500/5 border border-${field.color}-500/10 group-hover:scale-110 transition-transform mb-4`}>
                            <field.icon className={`w-8 h-8 text-${field.color}-500`} />
                          </div>
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">{field.label}</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              className="h-14 rounded-2xl border-white/10 bg-white/5 text-center font-black text-xl" 
                              {...inputField} 
                              onChange={(e) => inputField.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </AdminCard>
            </TabsContent>

            <TabsContent value="maintenance" className="focus-visible:outline-none">
              <AdminCard variant="glass" className="p-8 border-red-500/20 bg-red-500/5">
                <div className="flex items-center justify-between mb-10 border-b border-red-500/10 pb-6">
                  <div className="flex gap-4 items-center">
                    <div className="p-4 rounded-3xl bg-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.4)] animate-pulse">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-red-500">مقر الإصلاحات الطارئة</h3>
                      <p className="text-xs font-bold text-red-500/60 uppercase">عند تفعيل هذا المرسوم، سيتم إغلاق أبواب المملكة أمام الجميع فيما عدا القادة الكبار.</p>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="maintenance.enabled"
                    render={({ field }) => (
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="scale-125 data-[state=checked]:bg-red-500"
                        />
                      </FormControl>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="maintenance.message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest text-red-500/60">رسالة تظهر للمحاربين أثناء الصيانة</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="المملكة في مرحلة تطوير دفاعي.. سنعود أقوى قريبًا!" 
                          className="rounded-3xl border-red-500/10 bg-red-500/5 min-h-[150px] p-8 text-lg font-black text-red-500/80 placeholder:text-red-500/30"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </AdminCard>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}

function IconButton({ icon: Icon, onClick, title }: { icon: any, onClick?: () => void, title?: string }) {
  return (
    <button 
      type="button"
      onClick={onClick}
      title={title}
      className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-muted-foreground hover:text-white hover:bg-white/10 hover:border-white/20 transition-all active:scale-90"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}
