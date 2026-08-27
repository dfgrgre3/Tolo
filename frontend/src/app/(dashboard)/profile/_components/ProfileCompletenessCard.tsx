"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Gauge, ArrowLeft, CheckCircle2 } from "lucide-react";
import { COMPLETENESS_FIELDS } from "./profile.constants";
import { useProfileData } from "./useProfileData";

/**
 * Completeness meter — nudges the user toward a fuller profile by listing
 * exactly which fields are missing. Read-only over `GET /api/users/profile`
 * (not the auth context — see `COMPLETENESS_FIELDS`'s doc comment for why);
 * editing happens in the account tab.
 */
export default function ProfileCompletenessCard() {
  const router = useRouter();
  const { profile, isLoading } = useProfileData();

  const { completed, total, percent, missing } = useMemo(() => {
    if (!profile) return { completed: 0, total: 0, percent: 0, missing: [] };
    const missingFields = COMPLETENESS_FIELDS.filter((f) => !f.check(profile));
    return {
      completed: COMPLETENESS_FIELDS.length - missingFields.length,
      total: COMPLETENESS_FIELDS.length,
      percent: Math.round(
        ((COMPLETENESS_FIELDS.length - missingFields.length) / COMPLETENESS_FIELDS.length) * 100
      ),
      missing: missingFields,
    };
  }, [profile]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-2 w-full mt-3" />
        </CardHeader>
      </Card>
    );
  }

  if (!profile) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-5 h-5" /> اكتمال الملف الشخصي
          </CardTitle>
          <span className="text-sm font-bold tabular-nums" aria-live="polite">
            {percent}%
          </span>
        </div>
        <Progress value={percent} className="h-2 mt-2" aria-label={`اكتمال الملف الشخصي ${percent}%`} />
        <CardDescription className="pt-2">
          {percent === 100
            ? "ملفك مكتمل! أحسنت."
            : `${completed} من ${total} حقول مكتملة — أكمل الباقي لمساعدة المعلمين وزملائك على التعرف عليك.`}
        </CardDescription>
      </CardHeader>

      {missing.length > 0 && (
        <CardContent className="flex flex-wrap items-center gap-2">
          {missing.map((f) => (
            <Badge key={f.key} variant="outline" className="gap-1 text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 opacity-40" /> {f.label}
            </Badge>
          ))}
          <Button size="sm" variant="ghost" className="gap-1 ms-auto" onClick={() => router.push("/profile?tab=account")}>
            أكمل الآن <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
