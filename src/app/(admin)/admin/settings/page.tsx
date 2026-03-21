"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Settings,
  Globe,
  Mail,
  Phone,
  Share2,
  Gamepad2,
  Shield,
  Wrench,
  RefreshCw,
  Save,
  Download,
  Upload,
  History,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
} from "lucide-react";
import { SettingsSkeleton } from "@/components/admin/ui/loading-skeleton";

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string[];
  contactEmail: string;
  supportPhone: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  features: {
    registration: boolean;
    emailVerification: boolean;
    gamification: boolean;
    forum: boolean;
    blog: boolean;
    events: boolean;
    aiAssistant: boolean;
  };
  gamification: {
    xpPerTask: number;
    xpPerStudySession: number;
    xpPerExam: number;
    streakBonus: number;
  };
  limits: {
    maxUploadSize: number;
    maxStudySessionDuration: number;
    examTimeLimit: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
}

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
  const [lastSaved, setLastSaved] = React.useState<Date | null>(null);
  const [changeHistory, setChangeHistory] = React.useState<Array<{
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
    changedAt: Date;
    changedBy: string;
  }>>([]);

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
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("حدث خطأ أثناء جلب الإعدادات");
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
        toast.success("تم حفظ الإعدادات بنجاح");
        setLastSaved(new Date());
        setHasChanges(false);
      } else {
        toast.error("حدث خطأ أثناء حفظ الإعدادات");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
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
        toast.success("تم إعادة تعيين الإعدادات");
      }
    } catch (error) {
      console.error("Error resetting settings:", error);
      toast.error("حدث خطأ أثناء إعادة تعيين الإعدادات");
    }
  };

  const handleExportSettings = () => {
    const settings = form.getValues();
    const dataStr = JSON.stringify(settings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast.success("تم تصدير الإعدادات بنجاح");
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        form.reset({
          ...imported,
          siteKeywords: imported.siteKeywords?.join?.(", ") || imported.siteKeywords || "",
        });
        toast.success("تم استيراد الإعدادات بنجاح");
        setHasChanges(true);
      } catch {
        toast.error("فشل في قراءة ملف الإعدادات");
      }
    };
    reader.readAsText(file);
  };

  // Track changes
  React.useEffect(() => {
    const subscription = form.watch(() => {
      setHasChanges(form.formState.isDirty);
    });
    return () => subscription.unsubscribe();
  }, [form]);

  if (loading) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="إعدادات النظام"
        description="إدارة إعدادات الموقع العامة"
      >
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-xs text-muted-foreground hidden md:flex items-center gap-1">
              <Clock className="h-3 w-3" />
              آخر حفظ: {lastSaved.toLocaleTimeString("ar-EG")}
            </span>
          )}
          {hasChanges && (
            <Badge variant="secondary" className="text-xs">
              تغييرات غير محفوظة
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={handleExportSettings} className="rounded-lg">
            <Download className="ml-2 h-4 w-4" />
            تصدير
          </Button>
          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <Button variant="outline" size="sm" className="rounded-lg">
              <Upload className="ml-2 h-4 w-4" />
              استيراد
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset} className="rounded-lg">
            <RefreshCw className="ml-2 h-4 w-4" />
            إعادة تعيين
          </Button>
          <Button size="sm" onClick={form.handleSubmit(handleSave)} disabled={saving || !hasChanges} className="rounded-lg">
            <Save className="ml-2 h-4 w-4" />
            {saving ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </div>
      </PageHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">
                <Globe className="ml-2 h-4 w-4" />
                عام
              </TabsTrigger>
              <TabsTrigger value="features">
                <Shield className="ml-2 h-4 w-4" />
                الميزات
              </TabsTrigger>
              <TabsTrigger value="gamification">
                <Gamepad2 className="ml-2 h-4 w-4" />
                اللعب
              </TabsTrigger>
              <TabsTrigger value="limits">
                <Wrench className="ml-2 h-4 w-4" />
                الحدود
              </TabsTrigger>
              <TabsTrigger value="social">
                <Share2 className="ml-2 h-4 w-4" />
                التواصل
              </TabsTrigger>
              <TabsTrigger value="maintenance">
                <Settings className="ml-2 h-4 w-4" />
                الصيانة
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>الإعدادات العامة</CardTitle>
                  <CardDescription>الإعدادات الأساسية للموقع</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم الموقع</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="siteDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف الموقع</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="siteKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكلمات المفتاحية</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="تعليم, ثانوية, امتحانات" />
                        </FormControl>
                        <FormDescription>افصل بين الكلمات بفاصلة</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="contactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input {...field} type="email" className="pr-9" dir="ltr" />
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
                          <FormLabel>رقم الدعم</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input {...field} className="pr-9" dir="ltr" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Features Settings */}
            <TabsContent value="features">
              <Card>
                <CardHeader>
                  <CardTitle>ميزات الموقع</CardTitle>
                  <CardDescription>تفعيل أو تعطيل ميزات الموقع</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "registration", label: "التسجيل", desc: "السماح بتسجيل مستخدمين جدد" },
                      { key: "emailVerification", label: "التحقق من البريد", desc: "طلب التحقق من البريد الإلكتروني" },
                      { key: "gamification", label: "نظام اللعب", desc: "تفعيل نظام النقاط والإنجازات" },
                      { key: "forum", label: "المنتدى", desc: "تفعيل المنتدى والمناقشات" },
                      { key: "blog", label: "المدونة", desc: "تفعيل المدونة والمقالات" },
                      { key: "events", label: "الأحداث", desc: "تفعيل نظام الأحداث والفعاليات" },
                      { key: "aiAssistant", label: "المساعد الذكي", desc: "تفعيل المساعد الذكي للطلاب" },
                    ].map((feature) => (
                      <FormField
                        key={feature.key}
                        control={form.control}
                        name={`features.${feature.key}` as any}
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                              <FormLabel>{feature.label}</FormLabel>
                              <FormDescription>{feature.desc}</FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value as boolean}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Gamification Settings */}
            <TabsContent value="gamification">
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات نظام اللعب</CardTitle>
                  <CardDescription>تخصيص نقاط الخبرة والمكافآت</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gamification.xpPerTask"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نقاط لكل مهمة</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gamification.xpPerStudySession"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نقاط لكل جلسة دراسة</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gamification.xpPerExam"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نقاط لكل امتحان</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="gamification.streakBonus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مكافأة التتابع (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Limits Settings */}
            <TabsContent value="limits">
              <Card>
                <CardHeader>
                  <CardTitle>الحدود والقيود</CardTitle>
                  <CardDescription>تحديد حدود الاستخدام</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="limits.maxUploadSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>حجم الرفع الأقصى (MB)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="limits.maxStudySessionDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>مدة الجلسة القصوى (دقيقة)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="limits.examTimeLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>وقت الامتحان الافتراضي (دقيقة)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Social Links */}
            <TabsContent value="social">
              <Card>
                <CardHeader>
                  <CardTitle>روابط التواصل الاجتماعي</CardTitle>
                  <CardDescription>روابط حسابات الموقع على منصات التواصل</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="socialLinks.facebook"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>فيسبوك</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://facebook.com/..." dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تويتر</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://twitter.com/..." dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.instagram"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>انستجرام</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://instagram.com/..." dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="socialLinks.youtube"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>يوتيوب</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="https://youtube.com/..." dir="ltr" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Maintenance Mode */}
            <TabsContent value="maintenance">
              <Card>
                <CardHeader>
                  <CardTitle>وضع الصيانة</CardTitle>
                  <CardDescription>تفعيل وضع الصيانة لإيقاف الموقع مؤقتاً</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="maintenance.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <FormLabel>تفعيل وضع الصيانة</FormLabel>
                          <FormDescription>
                            عند التفعيل، سيتم إغلاق الموقع للمستخدمين العاديين
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="maintenance.message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>رسالة الصيانة</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="الموقع تحت الصيانة، يرجى المحاولة لاحقاً"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("maintenance.enabled") && (
                    <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">تحذير</Badge>
                        <span className="text-sm text-yellow-800">
                          وضع الصيانة مفعل - الموقع مغلق للمستخدمين
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </Form>
    </div>
  );
}
