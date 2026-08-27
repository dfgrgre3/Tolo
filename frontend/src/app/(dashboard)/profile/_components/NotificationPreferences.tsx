"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BellRing, Loader2 } from "lucide-react";
import { useAuthContext } from "@/contexts/auth-context";
import { fetchSettingsPreferences, saveSettingsPreferences } from "@/lib/settings-preferences";
import type { NotificationSettingsPreference } from "@/types/user-ui-preferences";

/**
 * Every field here is validated + persisted by `validateSettingsPatch` /
 * `applySettingsPatch` on the backend. Read/write both go through
 * `/api/settings/preferences`, NOT `/auth/me` — `User.emailNotifications` /
 * `User.SMSNotifications` exist as columns but no handler ever writes them.
 *
 * The schema carries two keys per channel (`emailNotifications` + `emailEnabled`,
 * `pushNotifications` + `pushEnabled`). They are surfaced as a single toggle and
 * written together so the pair can never drift apart.
 */

const REMINDER_LEAD_OPTIONS = [
  { value: "5", label: "٥ دقائق" },
  { value: "10", label: "١٠ دقائق" },
  { value: "15", label: "١٥ دقيقة" },
  { value: "30", label: "٣٠ دقيقة" },
  { value: "60", label: "ساعة" },
  { value: "120", label: "ساعتان" },
];

const EXAM_DAYS_OPTIONS = [
  { value: "1", label: "يوم واحد" },
  { value: "2", label: "يومان" },
  { value: "3", label: "٣ أيام" },
  { value: "5", label: "٥ أيام" },
  { value: "7", label: "أسبوع" },
];

export default function NotificationPreferences() {
  const { user } = useAuthContext();
  const [initial, setInitial] = useState<NotificationSettingsPreference | null>(null);
  const [form, setForm] = useState<NotificationSettingsPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettingsPreferences()
      .then((prefs) => {
        if (cancelled) return;
        setInitial(prefs.notifications);
        setForm(prefs.notifications);
      })
      .catch(() => {
        if (!cancelled) setError("تعذر تحميل تفضيلات الإشعارات.");
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => Boolean(form && initial) && JSON.stringify(form) !== JSON.stringify(initial),
    [form, initial]
  );

  function patch(changes: Partial<NotificationSettingsPreference>) {
    setForm((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  async function handleSave() {
    if (!form) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveSettingsPreferences({ notifications: form });
      setInitial(saved.notifications);
      setForm(saved.notifications);
      toast.success("تم حفظ تفضيلات الإشعارات");
    } catch {
      const message = "تعذر حفظ الإعدادات، حاول مرة أخرى.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  const master = Boolean(form?.notificationsEnabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="w-5 h-5" /> تفضيلات الإشعارات
        </CardTitle>
        <CardDescription>اختر ما تريد أن نُنبّهك إليه، وعبر أي قناة، وفي أي وقت.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {isLoading || !form ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </>
        ) : (
          <>
            <ToggleRow
              id="notif-master"
              label="تشغيل الإشعارات"
              hint="إيقافها يمنع كل التنبيهات دون فقدان تفضيلاتك."
              checked={form.notificationsEnabled}
              onChange={(v) => patch({ notificationsEnabled: v })}
            />

            <Separator />

            <Section title="القنوات">
              <ToggleRow
                id="notif-email"
                label="البريد الإلكتروني"
                hint="تنبيهات وتحديثات مهمة عبر البريد."
                checked={form.emailNotifications}
                disabled={!master}
                onChange={(v) => patch({ emailNotifications: v, emailEnabled: v })}
              />
              <ToggleRow
                id="notif-push"
                label="الإشعارات الفورية"
                hint="تنبيهات داخل المتصفح والتطبيق."
                checked={form.pushNotifications}
                disabled={!master}
                onChange={(v) => patch({ pushNotifications: v, pushEnabled: v })}
              />
              <ToggleRow
                id="notif-sms"
                label="الرسائل النصية"
                hint={user?.phone ? "تنبيهات عاجلة عبر SMS." : "أضف رقم هاتف في بيانات الحساب لتفعيلها."}
                checked={form.smsEnabled}
                disabled={!master || !user?.phone}
                onChange={(v) => patch({ smsEnabled: v })}
              />
            </Section>

            <Separator />

            <Section title="التذكيرات">
              <ToggleRow
                id="notif-study"
                label="تذكيرات المذاكرة"
                checked={form.studyReminders}
                disabled={!master}
                onChange={(v) => patch({ studyReminders: v })}
              />
              <ToggleRow
                id="notif-tasks"
                label="تذكيرات المهام"
                checked={form.taskReminders}
                disabled={!master}
                onChange={(v) => patch({ taskReminders: v })}
              />
              <SelectRow
                label="التذكير بالمهمة قبل موعدها"
                value={form.taskReminderTime}
                options={REMINDER_LEAD_OPTIONS}
                disabled={!master || !form.taskReminders}
                onChange={(v) => patch({ taskReminderTime: v })}
              />
              <ToggleRow
                id="notif-daily-goal"
                label="تذكير الهدف اليومي"
                checked={form.dailyGoalReminders}
                disabled={!master}
                onChange={(v) => patch({ dailyGoalReminders: v })}
              />
              <ToggleRow
                id="notif-exams"
                label="تذكيرات الامتحانات"
                checked={form.examReminders}
                disabled={!master}
                onChange={(v) => patch({ examReminders: v })}
              />
              <SelectRow
                label="التذكير بالامتحان قبل"
                value={String(form.examReminderDays)}
                options={EXAM_DAYS_OPTIONS}
                disabled={!master || !form.examReminders}
                onChange={(v) => patch({ examReminderDays: Number(v) })}
              />
              <ToggleRow
                id="notif-deadlines"
                label="تذكيرات المواعيد النهائية"
                checked={form.deadlineReminders}
                disabled={!master}
                onChange={(v) => patch({ deadlineReminders: v })}
              />
            </Section>

            <Separator />

            <Section title="التقارير والإنجازات">
              <ToggleRow
                id="notif-progress"
                label="تقارير التقدّم"
                checked={form.progressReports}
                disabled={!master}
                onChange={(v) => patch({ progressReports: v })}
              />
              <ToggleRow
                id="notif-weekly"
                label="الملخّص الأسبوعي"
                checked={form.weeklyReport}
                disabled={!master}
                onChange={(v) => patch({ weeklyReport: v })}
              />
              <ToggleRow
                id="notif-achievements"
                label="تنبيهات الإنجازات الجديدة"
                checked={form.achievementAlerts}
                disabled={!master}
                onChange={(v) => patch({ achievementAlerts: v })}
              />
            </Section>

            <Separator />

            <Section title="التفاعلات">
              <ToggleRow
                id="notif-comments"
                label="التعليقات والردود"
                checked={form.commentNotifications}
                disabled={!master}
                onChange={(v) => patch({ commentNotifications: v })}
              />
              <ToggleRow
                id="notif-mentions"
                label="الإشارات إليّ"
                checked={form.mentionNotifications}
                disabled={!master}
                onChange={(v) => patch({ mentionNotifications: v })}
              />
            </Section>

            <Separator />

            <Section title="ساعات الهدوء">
              <ToggleRow
                id="notif-quiet"
                label="كتم الإشعارات في فترة محددة"
                hint="لن تصلك تنبيهات بين الوقتين المحددين."
                checked={form.quietHoursEnabled}
                disabled={!master}
                onChange={(v) => patch({ quietHoursEnabled: v })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="quiet-start">من</Label>
                  <Input
                    id="quiet-start"
                    type="time"
                    value={form.quietHoursStart}
                    disabled={!master || !form.quietHoursEnabled}
                    onChange={(e) => patch({ quietHoursStart: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiet-end">إلى</Label>
                  <Input
                    id="quiet-end"
                    type="time"
                    value={form.quietHoursEnd}
                    disabled={!master || !form.quietHoursEnabled}
                    onChange={(e) => patch({ quietHoursEnd: e.target.value })}
                  />
                </div>
              </div>
            </Section>

            <Separator />

            <Section title="الصوت والاهتزاز">
              <ToggleRow
                id="notif-sound"
                label="نبرة صوتية مع التنبيه"
                checked={form.soundEnabled}
                disabled={!master}
                onChange={(v) => patch({ soundEnabled: v })}
              />
              <ToggleRow
                id="notif-vibration"
                label="اهتزاز على الأجهزة المحمولة"
                checked={form.vibrationEnabled}
                disabled={!master}
                onChange={(v) => patch({ vibrationEnabled: v })}
              />
            </Section>
          </>
        )}

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>

      <CardFooter className="justify-end gap-3">
        {isDirty && <span className="text-xs text-muted-foreground">لديك تغييرات غير محفوظة</span>}
        <Button onClick={handleSave} disabled={isLoading || isSaving || !isDirty}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ
        </Button>
      </CardFooter>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function SelectRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const matched = options.some((o) => o.value === value) ? value : options[0]?.value ?? "";
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="font-normal">{label}</Label>
      <Select value={matched} disabled={disabled} onValueChange={onChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
