"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthContext } from "@/contexts/auth-context";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import type { UpdateProfilePayload } from "@/types/user";
import { useProfileData, type UserProfileData } from "./useProfileData";
import {
  MAX_NAME_LEN,
  MAX_USERNAME_LEN,
  MAX_BIO_LEN,
  MAX_STUDY_GOAL_LEN,
  MAX_CITY_LEN,
  MAX_SCHOOL_LEN,
  GRADE_LEVELS,
  EDUCATION_TYPES,
  SECTIONS,
  COUNTRIES,
  GENDERS,
} from "./profile.constants";

/** Sentinel for "no selection" — Radix SelectItem cannot use an empty string. */
const NONE = "__none__";

interface FormState {
  name: string;
  username: string;
  phone: string;
  alternativePhone: string;
  country: string;
  city: string;
  gender: string;
  school: string;
  gradeLevel: string;
  educationType: string;
  section: string;
  birthDate: string;
  bio: string;
  studyGoal: string;
}

function toFormState(profile: UserProfileData): FormState {
  return {
    name: profile.name || "",
    username: profile.username || "",
    phone: profile.phone || "",
    alternativePhone: profile.alternativePhone || "",
    country: profile.country || "",
    city: profile.city || "",
    gender: profile.gender || "",
    school: profile.school || "",
    gradeLevel: profile.gradeLevel || "",
    educationType: profile.educationType || "",
    section: profile.section || "",
    birthDate: (profile.dateOfBirth || "").slice(0, 10),
    bio: profile.bio || "",
    studyGoal: profile.studyGoal || "",
  };
}

/**
 * Edits non-sensitive profile fields only (11 — 6.2). Email changes are out
 * of scope here — they require verification and live in SecuritySettings.
 *
 * Seeds from `GET /api/users/profile` (via `useProfileData`), not the auth
 * context — `/auth/me`'s `UserDTO` doesn't carry bio/phone/country/
 * gradeLevel/educationType/section/dateOfBirth/studyGoal at all, so those
 * fields would always show blank and a saved value would visibly revert
 * after `refreshUser()`.
 *
 * The PATCH body uses wire field names from
 * `user_profile_handler.go` (`birthDate`, `alternativePhone`, `gender`, `city`,
 * `school`); the previous form sent `dateOfBirth` and was silently dropped by
 * Gin, so changing only the birthdate appeared to save without persisting.
 */
export default function AccountSettingsForm() {
  const { user, refreshUser } = useAuthContext();
  const { profile, isLoading: isProfileLoading, refetch } = useProfileData();

  // The "saved" baseline is derived from the fetched profile, so a
  // background refetch (avatar upload, …) can never make this form drift
  // out of sync or clobber unsaved edits.
  const initial = useMemo(() => (profile ? toFormState(profile) : null), [profile]);

  const [form, setForm] = useState<FormState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = !!form && !!initial && JSON.stringify(form) !== JSON.stringify(initial);

  // Seed the form once the profile loads, and re-seed it after the post-save
  // `refetch()` (below) brings in the saved values — but never while dirty,
  // so an in-progress edit is never clobbered. Adjusted during render (React's
  // documented pattern for "state derived from a prop") rather than an
  // effect, so this doesn't fire an extra render on top of the profile fetch.
  const [seededInitial, setSeededInitial] = useState<FormState | null>(null);
  if (initial && initial !== seededInitial && !isDirty) {
    setSeededInitial(initial);
    setForm(initial);
  }

  function update<K extends keyof FormState>(key: K, value: string) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  // 12.12 — Unsaved Changes: block accidental tab close/reload while dirty.
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function validate(state: FormState): string | null {
    if (state.name.trim().length === 0) return "الاسم مطلوب.";
    if (state.name.length > MAX_NAME_LEN) return "الاسم يتجاوز الحد الأقصى للطول.";
    if (state.bio.length > MAX_BIO_LEN) return "النبذة تتجاوز الحد الأقصى للطول.";
    if (state.studyGoal.length > MAX_STUDY_GOAL_LEN) return "الهدف الدراسي يتجاوز الحد الأقصى للطول.";
    if (state.city && state.city.length > MAX_CITY_LEN) return "المدينة تتجاوز الحد الأقصى للطول.";
    if (state.school && state.school.length > MAX_SCHOOL_LEN) return "اسم المدرسة يتجاوز الحد الأقصى للطول.";
    if (state.username && !/^[a-zA-Z0-9_.]{3,}$/.test(state.username)) {
      return "اسم المستخدم يجب أن يتكوّن من 3 أحرف إنجليزية على الأقل (حروف وأرقام وشرطة سفلية فقط).";
    }
    if (state.phone && !/^\+?[0-9\s-]{7,20}$/.test(state.phone)) {
      return "رقم الهاتف غير صالح.";
    }
    if (state.alternativePhone && !/^\+?[0-9\s-]{7,20}$/.test(state.alternativePhone)) {
      return "رقم الهاتف البديل غير صالح.";
    }
    if (state.birthDate && new Date(state.birthDate) > new Date()) {
      return "تاريخ الميلاد لا يمكن أن يكون في المستقبل.";
    }
    return null;
  }

  function buildPatch(state: FormState): UpdateProfilePayload {
    if (!initial) return {};
    const opt = (v: string) => (v.trim() ? v.trim() : undefined);
    const pick = <K extends keyof FormState>(k: K) =>
      state[k] !== initial[k] ? opt(state[k]) : undefined;

    const patch: UpdateProfilePayload = {
      name: state.name.trim() !== initial.name.trim() ? state.name.trim() : undefined,
      username: pick("username"),
      phone: pick("phone"),
      alternativePhone: pick("alternativePhone"),
      country: pick("country"),
      city: pick("city"),
      gender: pick("gender"),
      school: pick("school"),
      gradeLevel: pick("gradeLevel"),
      educationType: pick("educationType"),
      section: pick("section"),
      birthDate: pick("birthDate"),
      bio: state.bio !== initial.bio ? state.bio.trim() || undefined : undefined,
      studyGoal: pick("studyGoal"),
    };
    return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as UpdateProfilePayload;
  }

  async function handleSave() {
    if (!form) return;
    const validationError = validate(form);
    if (validationError) {
      setError(validationError);
      return;
    }

    const patch = buildPatch(form);
    if (Object.keys(patch).length === 0) {
      toast.info("لا توجد تغييرات لحفظها");
      return;
    }

    setError(null);
    setIsSaving(true);
    try {
      await apiClient.patch(apiRoutes.users.profile, patch);
      // `refreshUser()` re-syncs identity shown elsewhere (header, name);
      // `refetch()` re-syncs the extended fields this form itself reads —
      // `/auth/me` doesn't return them, `/api/users/profile` does.
      await refreshUser();
      refetch();
      toast.success("تم حفظ بياناتك بنجاح");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر حفظ الإعدادات، حاول مرة أخرى.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    setForm(initial);
    setError(null);
  }

  if (!user) return null;

  if (isProfileLoading || !form) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>البيانات الأساسية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Sections (علمي/أدبي) apply to secondary stages only.
  const showSection = !form.gradeLevel || form.gradeLevel.includes("SECONDARY");

  return (
    <Card>
      <CardHeader>
        <CardTitle>البيانات الأساسية</CardTitle>
        <CardDescription>هذه البيانات تظهر لك فقط ولمن تسمح لهم رؤية ملفك.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">الاسم</Label>
            <Input
              id="profile-name"
              value={form.name}
              maxLength={MAX_NAME_LEN}
              onChange={(e) => update("name", e.target.value)}
              aria-invalid={!!error}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-username">اسم المستخدم</Label>
            <Input
              id="profile-username"
              value={form.username}
              maxLength={MAX_USERNAME_LEN}
              dir="ltr"
              placeholder="ahmed_2008"
              onChange={(e) => update("username", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-bio">نبذة قصيرة</Label>
          <Textarea
            id="profile-bio"
            value={form.bio}
            maxLength={MAX_BIO_LEN}
            rows={3}
            onChange={(e) => update("bio", e.target.value)}
          />
          <p className="text-xs text-muted-foreground text-left">{form.bio.length}/{MAX_BIO_LEN}</p>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="profile-phone">رقم الهاتف</Label>
            <Input
              id="profile-phone"
              type="tel"
              dir="ltr"
              value={form.phone}
              placeholder="+201234567890"
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-alt-phone">هاتف بديل</Label>
            <Input
              id="profile-alt-phone"
              type="tel"
              dir="ltr"
              value={form.alternativePhone}
              placeholder="اختياري"
              onChange={(e) => update("alternativePhone", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-dob">تاريخ الميلاد</Label>
            <Input
              id="profile-dob"
              type="date"
              value={form.birthDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => update("birthDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-gender">الجنس</Label>
            <Select value={form.gender || NONE} onValueChange={(v) => update("gender", v === NONE ? "" : v)}>
              <SelectTrigger id="profile-gender">
                <SelectValue placeholder="اختر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدد</SelectItem>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-country">الدولة</Label>
            <Select value={form.country || NONE} onValueChange={(v) => update("country", v === NONE ? "" : v)}>
              <SelectTrigger id="profile-country">
                <SelectValue placeholder="اختر دولتك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدد</SelectItem>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-city">المدينة</Label>
            <Input
              id="profile-city"
              value={form.city}
              maxLength={MAX_CITY_LEN}
              onChange={(e) => update("city", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-school">المدرسة</Label>
            <Input
              id="profile-school"
              value={form.school}
              maxLength={MAX_SCHOOL_LEN}
              onChange={(e) => update("school", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-grade">الصف الدراسي</Label>
            <Select value={form.gradeLevel || NONE} onValueChange={(v) => update("gradeLevel", v === NONE ? "" : v)}>
              <SelectTrigger id="profile-grade">
                <SelectValue placeholder="اختر صفك" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدد</SelectItem>
                {GRADE_LEVELS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-education-type">نوع التعليم</Label>
            <Select
              value={form.educationType || NONE}
              onValueChange={(v) => update("educationType", v === NONE ? "" : v)}
            >
              <SelectTrigger id="profile-education-type">
                <SelectValue placeholder="اختر نوع التعليم" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>غير محدد</SelectItem>
                {EDUCATION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showSection && (
            <div className="space-y-2">
              <Label htmlFor="profile-section">القسم</Label>
              <Select value={form.section || NONE} onValueChange={(v) => update("section", v === NONE ? "" : v)}>
                <SelectTrigger id="profile-section">
                  <SelectValue placeholder="اختر القسم" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>غير محدد</SelectItem>
                  {SECTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-study-goal">هدفك الدراسي</Label>
          <Input
            id="profile-study-goal"
            value={form.studyGoal}
            maxLength={MAX_STUDY_GOAL_LEN}
            placeholder="مثال: التفوق في الرياضيات والفيزياء"
            onChange={(e) => update("studyGoal", e.target.value)}
          />
        </div>

        <div className="space-y-2 opacity-70">
          <Label htmlFor="profile-email">البريد الإلكتروني</Label>
          <Input id="profile-email" value={user.email} disabled />
          <p className="text-xs text-muted-foreground">تغيير البريد يتطلب تحققًا — غير متاح حاليًا.</p>
        </div>

        {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        {isDirty && (
          <Button variant="ghost" onClick={handleDiscard} disabled={isSaving}>
            تجاهل التغييرات
          </Button>
        )}
        <Button onClick={handleSave} disabled={!isDirty || isSaving}>
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          حفظ التغييرات
        </Button>
      </CardFooter>
    </Card>
  );
}
