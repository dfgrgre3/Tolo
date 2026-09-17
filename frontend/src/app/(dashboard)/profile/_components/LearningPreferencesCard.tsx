"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock3, Languages, Loader2 } from "lucide-react";
import { fetchSettingsPreferences, saveSettingsPreferences } from "@/lib/settings-preferences";

// The app only ships ar/en message catalogs (`src/messages/{ar,en}`), and the
// backend's `validateSettingsPatch` only accepts these two for `language` —
// matches on both ends, not fabricated.
const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

const TIMEZONES = [
  { value: "Africa/Cairo", label: "القاهرة (UTC+02:00)" },
  { value: "Asia/Riyadh", label: "الرياض (UTC+03:00)" },
  { value: "Asia/Dubai", label: "دبي (UTC+04:00)" },
  { value: "Europe/London", label: "لندن" },
  { value: "Europe/Paris", label: "باريس" },
  { value: "America/New_York", label: "نيويورك" },
  { value: "America/Los_Angeles", label: "لوس أنجلوس" },
  { value: "Asia/Tokyo", label: "طوكيو" },
];

/** 10.14 — language and timezone used by reminders and quiet hours. */
export default function LearningPreferencesCard() {
  const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [initialTimezone, setInitialTimezone] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSettingsPreferences()
      .then((prefs) => {
        if (cancelled) return;
        setInitialLanguage(prefs.language.language);
        setLanguage(prefs.language.language);
        const detectedTimezone = prefs.language.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
        setInitialTimezone(detectedTimezone);
        setTimezone(detectedTimezone);
      })
      .catch(() => {
        if (cancelled) return;
        setError("تعذر تحميل التفضيلات، القيم الافتراضية معروضة.");
        setInitialLanguage("ar");
        setLanguage("ar");
        setInitialTimezone("Africa/Cairo");
        setTimezone("Africa/Cairo");
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty =
    (language !== null && language !== initialLanguage) ||
    (timezone !== null && timezone !== initialTimezone);

  function handleDiscard() {
    setLanguage(initialLanguage);
    setTimezone(initialTimezone);
    setError(null);
  }

  async function handleSave() {
    if (!language) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveSettingsPreferences({ language: { language, timezone: timezone ?? "Africa/Cairo" } });
      setInitialLanguage(language);
      setInitialTimezone(timezone ?? "Africa/Cairo");
      toast.success("تم حفظ التفضيلات");
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
          <Languages className="w-5 h-5" /> لغة الواجهة والمنطقة الزمنية
        </CardTitle>
        <CardDescription>تتحكم في اللغة المعروضة في المنصة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اللغة</Label>
              <Select value={language ?? undefined} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> المنطقة الزمنية</Label>
              <Select value={timezone ?? undefined} onValueChange={setTimezone}>
                <SelectTrigger><SelectValue placeholder="اختر المنطقة الزمنية" /></SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
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
        <Button onClick={handleSave} disabled={isLoading || isSaving || !isDirty}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ
        </Button>
      </CardFooter>
    </Card>
  );
}
