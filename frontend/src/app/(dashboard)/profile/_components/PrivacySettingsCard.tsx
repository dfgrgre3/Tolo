"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Lock } from "lucide-react";
import { fetchSettingsPreferences, saveSettingsPreferences } from "@/lib/settings-preferences";
import type { PrivacySettingsPreference } from "@/types/user-ui-preferences";

const VISIBILITY_OPTIONS: { value: PrivacySettingsPreference["profileVisibility"]; label: string }[] = [
  { value: "public", label: "عام" },
  { value: "friends", label: "الأصدقاء فقط" },
  { value: "private", label: "خاص" },
];

const MESSAGE_OPTIONS: { value: NonNullable<PrivacySettingsPreference["allowMessages"]>; label: string }[] = [
  { value: "everyone", label: "الجميع" },
  { value: "friends", label: "الأصدقاء فقط" },
  { value: "none", label: "لا أحد" },
];

/**
 * 10.15 — only the toggles the settings schema already models
 * (`PrivacySettingsPreference`) are shown; nothing invented beyond it.
 */
export default function PrivacySettingsCard() {
  const [initial, setInitial] = useState<PrivacySettingsPreference | null>(null);
  const [privacy, setPrivacy] = useState<PrivacySettingsPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettingsPreferences()
      .then((prefs) => {
        if (!cancelled) {
          setInitial(prefs.privacy);
          setPrivacy(prefs.privacy);
        }
      })
      .catch(() => {
        if (!cancelled) setError("تعذر تحميل إعدادات الخصوصية.");
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(
    () => Boolean(privacy && initial) && JSON.stringify(privacy) !== JSON.stringify(initial),
    [privacy, initial]
  );

  function update<K extends keyof PrivacySettingsPreference>(key: K, value: PrivacySettingsPreference[K]) {
    setPrivacy((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function handleDiscard() {
    setPrivacy(initial);
    setError(null);
  }

  async function handleSave() {
    if (!privacy) return;
    setIsSaving(true);
    setError(null);
    try {
      const saved = await saveSettingsPreferences({ privacy });
      setInitial(saved.privacy);
      setPrivacy(saved.privacy);
      toast.success("تم حفظ إعدادات الخصوصية");
    } catch {
      const message = "تعذر حفظ الإعدادات، حاول مرة أخرى.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="w-5 h-5" /> الخصوصية
        </CardTitle>
        <CardDescription>تحكّم في ما يراه الآخرون من ملفك ونشاطك.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {isLoading || !privacy ? (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label>ظهور الملف الشخصي</Label>
              <Select
                value={privacy.profileVisibility}
                onValueChange={(v: PrivacySettingsPreference["profileVisibility"]) => update("profileVisibility", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIBILITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>من يمكنه مراسلتي</Label>
              <Select
                value={privacy.allowMessages ?? "everyone"}
                onValueChange={(v: NonNullable<PrivacySettingsPreference["allowMessages"]>) => update("allowMessages", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MESSAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <PrivacyToggle
              label="إظهار تقدمي الدراسي"
              checked={privacy.showProgress}
              onChange={(v) => update("showProgress", v)}
            />
            <PrivacyToggle
              label="إظهار إنجازاتي وشهاداتي"
              checked={privacy.showAchievements ?? true}
              onChange={(v) => update("showAchievements", v)}
            />
            <PrivacyToggle
              label="إظهار حالة الاتصال (متصل الآن)"
              checked={privacy.showOnlineStatus}
              onChange={(v) => update("showOnlineStatus", v)}
            />
            <PrivacyToggle
              label="إظهار آخر ظهور"
              checked={privacy.showLastSeen ?? true}
              onChange={(v) => update("showLastSeen", v)}
            />
            <PrivacyToggle
              label="السماح بطلبات الصداقة"
              checked={privacy.allowFriendRequests ?? true}
              onChange={(v) => update("allowFriendRequests", v)}
            />

            <Separator />

            <h3 className="text-sm font-semibold text-muted-foreground">البيانات والتحليلات</h3>

            <PrivacyToggle
              label="السماح بجمع بيانات الاستخدام"
              hint="تُستخدم لتشغيل الميزات وحفظ تقدّمك."
              checked={privacy.dataCollection ?? true}
              onChange={(v) => update("dataCollection", v)}
            />
            <PrivacyToggle
              label="السماح بجمع بيانات لتحسين التوصيات"
              checked={privacy.personalization ?? true}
              onChange={(v) => update("personalization", v)}
            />
            <PrivacyToggle
              label="المشاركة في تحليلات تحسين المنصة"
              hint="إحصاءات مجمّعة لتطوير التجربة."
              checked={privacy.analytics ?? true}
              onChange={(v) => update("analytics", v)}
            />
          </>
        )}

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
      <CardFooter className="justify-end gap-3">
        {isDirty && (
          <>
            <span className="text-xs text-muted-foreground">لديك تغييرات غير محفوظة</span>
            <Button variant="ghost" onClick={handleDiscard} disabled={isSaving}>
              تجاهل
            </Button>
          </>
        )}
        <Button onClick={handleSave} disabled={isLoading || isSaving || !privacy || !isDirty}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ
        </Button>
      </CardFooter>
    </Card>
  );
}

function PrivacyToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = `privacy-${label}`;
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-0.5">
        <Label htmlFor={id} className="font-normal">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
