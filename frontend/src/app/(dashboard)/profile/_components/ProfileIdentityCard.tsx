"use client";

import { useAuthContext } from "@/contexts/auth-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BadgeCheck,
  ShieldAlert,
  CalendarDays,
  LogIn,
  MapPin,
  AtSign,
  Flame,
  Sparkles,
} from "lucide-react";
import AvatarUploader from "./AvatarUploader";
import { ROLE_LABELS, formatArabicDate, COUNTRIES, GRADE_LEVELS } from "./profile.constants";
import { useProfileData } from "./useProfileData";
import { useGamificationProgress } from "./useGamification";

function countryLabel(code?: string | null): string | null {
  if (!code) return null;
  return COUNTRIES.find((c) => c.value === code)?.label ?? code;
}

function gradeLabel(value?: string | null): string | null {
  if (!value) return null;
  return GRADE_LEVELS.find((g) => g.value === value)?.label ?? value;
}

/**
 * Identity summary + avatar management — field editing lives in AccountSettingsForm.
 *
 * Identity fields (email/role/createdAt/lastLogin) come from the auth context,
 * but country/gradeLevel/city are read from `GET /api/users/profile`: `/auth/me`
 * simply doesn't return them, so sourcing them from the context rendered a
 * permanently empty location line.
 */
export default function ProfileIdentityCard() {
  const { user } = useAuthContext();
  const { profile } = useProfileData();
  const { progress } = useGamificationProgress();

  if (!user) return null;

  const needsVerification = !user.emailVerified;
  const memberSince = formatArabicDate(user.createdAt);
  const lastLogin = formatArabicDate(user.lastLogin);
  const location =
    [countryLabel(profile?.country), profile?.city, gradeLabel(profile?.gradeLevel)]
      .filter(Boolean)
      .join(" · ") || null;

  const emailVerified = profile?.emailVerified ?? user.emailVerified;
  const phone = profile?.phone ?? user.phone;
  const phoneVerified = profile?.phoneVerified ?? user.phoneVerified;
  const bio = profile?.bio?.trim() || null;

  return (
    <Card className="overflow-hidden">
      <div className="h-20 bg-gradient-to-l from-primary/15 via-primary/5 to-transparent" />
      <CardContent className="flex flex-col sm:flex-row items-center sm:items-start gap-5 -mt-12">
        <div className="rounded-full ring-4 ring-background">
          <AvatarUploader />
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-start space-y-2 sm:pt-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-2">
            <h1 className="text-2xl font-bold truncate">{user.name || user.username || "بدون اسم"}</h1>
            <Badge variant="outline" className="shrink-0">
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
            {progress ? (
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> المستوى {progress.level}
                </Badge>
                {progress.currentStreak > 0 && (
                  <Badge variant="secondary" className="gap-1 text-orange-600 dark:text-orange-400">
                    <Flame className="w-3.5 h-3.5" /> {progress.currentStreak} يوم
                  </Badge>
                )}
              </div>
            ) : (
              <Skeleton className="h-5 w-24 shrink-0" />
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="truncate">{user.email}</span>
            {user.username && (
              <span className="inline-flex items-center gap-1 truncate">
                <AtSign className="w-3.5 h-3.5" /> {user.username}
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> {location}
              </span>
            )}
          </div>

          {bio && (
            <p className="max-w-prose text-sm leading-relaxed text-muted-foreground text-center sm:text-start">
              {bio}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {emailVerified ? (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> البريد موثّق
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> البريد غير موثّق
              </Badge>
            )}
            {phone && (
              <Badge variant={phoneVerified ? "secondary" : "outline"} className="gap-1">
                {phoneVerified ? <BadgeCheck className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                {phoneVerified ? "الهاتف موثّق" : "الهاتف غير موثّق"}
              </Badge>
            )}
            {profile?.mfaEnabled && (
              <Badge variant="secondary" className="gap-1">
                <BadgeCheck className="w-3.5 h-3.5" /> التحقق بخطوتين مُفعَّل
              </Badge>
            )}
          </div>

          {(memberSince || lastLogin) && (
            <>
              <Separator className="my-2" />
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {memberSince && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> عضو منذ {memberSince}
                  </span>
                )}
                {lastLogin && (
                  <span className="inline-flex items-center gap-1">
                    <LogIn className="w-3.5 h-3.5" /> آخر دخول {lastLogin}
                  </span>
                )}
              </div>
            </>
          )}

          {needsVerification && (
            <p className="text-xs text-amber-500 pt-1">
              يرجى تأكيد بريدك الإلكتروني لاستخدام كل ميزات المنصة.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
