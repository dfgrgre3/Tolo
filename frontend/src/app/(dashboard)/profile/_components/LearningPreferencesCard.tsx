"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Languages } from "lucide-react";
import { fetchSettingsPreferences, saveSettingsPreferences } from "@/lib/settings-preferences";

// The app only ships ar/en message catalogs (`src/messages/{ar,en}`), and the
// backend's `validateSettingsPatch` only accepts these two for `language` —
// matches on both ends, not fabricated.
const LANGUAGES = [
  { value: "ar", label: "العربية" },
  { value: "en", label: "English" },
];

// No timezone here: `UserSettings` (backend/internal/domain/common/user_settings.go)
// has no timezone column and `applySettingsPatch` has no case for it, so a
// timezone selector would silently no-op on save — removed rather than ship
// a control that does nothing.

/** 10.14 — language only; timezone isn't in the backend schema (see above). */
export default function LearningPreferencesCard() {
  const [initialLanguage, setInitialLanguage] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
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
      })
      .catch(() => {
        if (cancelled) return;
        setError("تعذر تحميل التفضيلات، القيم الافتراضية معروضة.");
        setInitialLanguage("ar");
        setLanguage("ar");
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = language !== null && language !== initialLanguage;

  function handleDiscard() {
    setLanguage(initialLanguage);
    setError(null);
  }

  async function handleSave() {
    if (!language) return;
    setIsSaving(true);
    setError(null);
    try {
      await saveSettingsPreferences({ language: { language } });
      setInitialLanguage(language);
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
          <Languages className="w-5 h-5" /> لغة الواجهة
        </CardTitle>
        <CardDescription>تتحكم في اللغة المعروضة في المنصة.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : (
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
