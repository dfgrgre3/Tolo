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
import { useForm, Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Globe,
  Mail,
  Phone,
  Share2,
  Wrench,
  RefreshCw,
  Save,
  Download,
  AlertTriangle,
  Clock,
  Zap,
  Lock,
  Layout,
  Server,
  Users,
  MessageCircle,
  Target,
  TrendingUp,
  Sparkles,
  Star
} from "lucide-react";
import { SettingsSkeleton } from "@/components/admin/ui/loading-skeleton";
import { logger } from '@/lib/logger';

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
    engagement: z.boolean(),
    forum: z.boolean(),
    blog: z.boolean(),
    events: z.boolean(),
    aiAssistant: z.boolean(),
  }),
  engagement: z.object({
    pointsPerTask: z.number().min(0),
    pointsPerStudySession: z.number().min(0),
    pointsPerExam: z.number().min(0),
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
        engagement: true,
        forum: true,
        blog: true,
        events: true,
        aiAssistant: true,
      },
      engagement: {
        pointsPerTask: 10,
        pointsPerStudySession: 5,
        pointsPerExam: 20,
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
    } catch (err: unknown) {
      toast.error("حدث خطأ أثناء جلب الإعدادات");
      logger.error(err instanceof Error ? err.message : String(err));
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
        toast.success("تم حفظ إعدادات النظام بنجاح");
        setLastSaved(new Date());
        setHasChanges(false);
      } else {
        toast.error("فشل في حفظ الإعدادات");
      }
    } catch (err: unknown) {
      toast.error("خطأ في الاتصال بالخادم");
      logger.error(err instanceof Error ? err.message : String(err));
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
        toast.success("تمت العودة للقيم الافتراضية");
      }
    } catch (err: unknown) {
      toast.error("فشل في استعادة القيم الأصلية");
      logger.error(err instanceof Error ? err.message : String(err));
    }
  };

  const handleExportSettings = () => {
    const settings = form.getValues();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `system-settings-${new Date().toISOString().split('T')[0]}.json`);
    linkElement.click();
    toast.success("تم تصدير نسخة من إعدادات المنصة");
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
        title="إعدادات المنصة المركزية"
        description="إدارة التكوينات الأساسية، تفعيل المزايا التعليمية، وشؤون الصيانة العامة للنظام."
      >
        <div className="flex items-center gap-3">
          {hasChanges && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-black h-8 px-4 rounded-xl">
              تعديلات معلقة
            </Badge>
          )}
          
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl shadow-2xl">
            <SettingsIconButton icon={Download} onClick={handleExportSettings} title="تصدير الإعدادات" />
            <SettingsIconButton icon={RefreshCw} onClick={handleReset} title="استعادة الافتراضي" />
            <div className="w-px h-6 bg-white/10 self-center mx-1" />
            <AdminButton 
              variant="premium"
              size="sm" 
              onClick={form.handleSubmit(handleSave)} 
              disabled={saving || !hasChanges} 
              className="h-9 px-6 rounded-xl font-black shadow-xl"
              icon={Save}
            >
              {saving ? "جاري الحفظ..." : "حفظ التغييرات"}
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
                { value: "features", label: "المزايا والخصائص", icon: Zap, color: "amber" },
                { value: "engagement", label: "نظام التحفيز", icon: Star, color: "purple" },
                { value: "limits", label: "حدود النظام", icon: Wrench, color: "emerald" },
                { value: "social", label: "روابط التواصل", icon: Share2, color: "pink" },
                { value: "maintenance", label: "وضع الصيانة", icon: Server, color: "red" },
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
                    <h3 className="text-xl font-black">الهوية الرقمية للمنصة</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase opacity-60">تحديد الاسم، الوصف، والكلمات الدليلية لمحركات البحث.</p>
                  </div>
                </div>

                <div className="grid gap-8">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">اسم المنصة الرسمي</FormLabel>
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
                        <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">وصف المنصة (SEO Description)</FormLabel>
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
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">بريد التواصل الرسمي</FormLabel>
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
                          <FormLabel className="font-black text-[10px] uppercase tracking-widest opacity-60">هاتف الدعم الفني</FormLabel>
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
                  { key: "registration", label: "تسجيل المستخدمين", icon: Users, desc: "السماح بانضمام مستخدمين جدد للمنصة" },
                  { key: "emailVerification", label: "التحقق من البريد", icon: Lock, desc: "طلب التأكد من هوية المستخدم عبر البريد" },
                  { key: "engagement", label: "نظام التحفيز والتقدير", icon: Star, desc: "تفعيل نظام النقاط والمستويات للطلاب" },
                  { key: "forum", label: "منتدى النقاش العلمي", icon: MessageCircle, desc: "تفعيل ساحات الحوار والتبادل المعرفي" },
                  { key: "blog", label: "المدونة الأكاديمية", icon: Layout, desc: "تفعيل التدوينات والمقالات التعليمية" },
                  { key: "aiAssistant", label: "المساعد التعليمي (AI)", icon: Sparkles, desc: "تفعيل الذكاء الاصطناعي لمساعدة الطلاب" },
                ].map((feature) => (
                  <FormField
                    key={feature.key}
                    control={form.control}
                    name={`features.${feature.key}` as Path<SettingsFormValues>}
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

            <TabsContent value="engagement" className="focus-visible:outline-none">
              <AdminCard variant="glass" className="p-8">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-500 border border-purple-500/20 shadow-sm">
                    <Star className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">إعدادات نقاط التفاعل</h3>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">تحديد وزن النقاط الممنوحة مقابل الأنشطة التعليمية.</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-8">
                  {[
                    { key: "pointsPerTask", label: "إتمام مهمة", icon: Zap, color: "amber" },
                    { key: "pointsPerStudySession", label: "جلسة دراسية", icon: Clock, color: "blue" },
                    { key: "pointsPerExam", label: "اجتياز اختبار", icon: Target, color: "red" },
                    { key: "streakBonus", label: "مكافأة الاستمرارية %", icon: TrendingUp, color: "emerald" },
                  ].map((field) => (
                    <FormField
                      key={field.key}
                      control={form.control}
                      name={`engagement.${field.key}` as Path<SettingsFormValues>}
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
                              value={typeof inputField.value === 'number' || typeof inputField.value === 'string' ? inputField.value : ""}
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
                    <div className="p-4 rounded-3xl bg-red-500 text-white shadow-lg animate-pulse">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-red-500">وضع الصيانة والنظام</h3>
                      <p className="text-xs font-bold text-red-500/60 uppercase">عند التفعيل، سيتم إغلاق المنصة أمام الطلاب والاكتفاء بدخول المسؤولين فقط.</p>
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
                      <FormLabel className="font-black text-[10px] uppercase tracking-widest text-red-500/60">رسالة تنبيه المستخدمين</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="المنصة تحت الصيانة الدورية حالياً.. سنعود قريباً لخدمتكم." 
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

function SettingsIconButton({ icon: Icon, onClick, title }: { icon: React.ElementType, onClick?: () => void, title?: string }) {
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
