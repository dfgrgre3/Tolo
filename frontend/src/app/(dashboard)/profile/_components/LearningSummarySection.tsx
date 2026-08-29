"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { GraduationCap, Wallet, ArrowLeft } from "lucide-react";
import InlineErrorState from "./InlineErrorState";
import LearningPreferencesCard from "./LearningPreferencesCard";
import { formatMinutes, useProgressSummary } from "./useProgressSummary";

/**
 * 10.4 — Learning Summary. Deliberately a summary + deep links, not a
 * re-implementation of /academy's enrollment list or /billing's wallet —
 * those pages own pagination and filtering for their own data (9 — no
 * duplicated list logic across sections).
 */
export default function LearningSummarySection() {
  const { summary, isLoading, error, retry } = useProgressSummary();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> ملخص النشاط الدراسي
          </CardTitle>
          <CardDescription>وقت المذاكرة، المهام، والانتظام في آخر فترة.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : error ? (
            <InlineErrorState message={error} onRetry={retry} />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatTile label="وقت المذاكرة" value={formatMinutes(summary?.totalMinutes ?? 0)} />
              <StatTile label="مهام مكتملة" value={summary?.tasksCompleted ?? 0} />
              <StatTile label="أيام الانتظام" value={summary?.streakDays ?? 0} />
              <StatTile label="متوسط التركيز" value={`${Math.round(summary?.averageFocus ?? 0)}%`} />
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-6">
            <Link href="/courses">
              <Button variant="outline" className="gap-2">
                عرض كورساتي <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/academy">
              <Button variant="ghost" className="gap-2">
                استكشاف الأكاديمية <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" /> المحفظة والطلبات
          </CardTitle>
          <CardDescription>الاشتراكات، المعاملات، والفواتير تُدار من المركز المالي.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/billing">
            <Button variant="outline" className="gap-2">
              الذهاب للمركز المالي <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <LearningPreferencesCard />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4 text-center">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
