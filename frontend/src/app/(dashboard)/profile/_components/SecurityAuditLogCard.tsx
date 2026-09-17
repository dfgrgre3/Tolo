"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import InlineErrorState from "./InlineErrorState";

interface SecurityEvent {
  id: string;
  event: string;
  actor: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  timestamp: string;
  risk: string;
  metadata: Record<string, unknown>;
}

interface SecurityEventsPage {
  events: SecurityEvent[];
  nextCursor?: string;
}

const EVENT_LABELS: Record<string, string> = {
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  PASSWORD_CHANGED: "تغيير كلمة المرور",
  MFA_ENABLED: "تفعيل المصادقة الثنائية",
  MFA_DISABLED: "إيقاف المصادقة الثنائية",
  SESSION_REVOKED: "إنهاء جلسة",
  TERMINATE_SESSION: "إنهاء جلسة",
  OAUTH_LINKED: "ربط حساب خارجي",
  OAUTH_UNLINKED: "فصل حساب خارجي",
  EMAIL_CHANGED: "تغيير البريد الإلكتروني",
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar-EG");
}

export default function SecurityAuditLogCard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(cursor?: string) {
    const query = cursor ? `?limit=20&cursor=${encodeURIComponent(cursor)}` : "?limit=20";
    const data = await apiClient.get<SecurityEventsPage>(`${apiRoutes.auth.securityEvents}${query}`);
    setEvents((current) => cursor ? [...current, ...data.events] : data.events);
    setNextCursor(data.nextCursor || null);
  }

  useEffect(() => {
    load()
      .catch((err) => setError(err instanceof ApiError ? err.message : "تعذر تحميل سجل الأمان."))
      .finally(() => setIsLoading(false));
  }, []);

  async function loadMore() {
    if (!nextCursor) return;
    setIsLoadingMore(true);
    try {
      await load(nextCursor);
    } catch {
      setError("تعذر تحميل المزيد من أحداث الأمان.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> سجل الأمان
        </CardTitle>
        <CardDescription>أحداث الأمان الخاصة بحسابك، منفصلة عن النشاط الدراسي والإشعارات.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
        ) : error && events.length === 0 ? (
          <InlineErrorState message={error} onRetry={() => { setError(null); setIsLoading(true); load().catch(() => setError("تعذر تحميل سجل الأمان.")).finally(() => setIsLoading(false)); }} />
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد أحداث أمان مسجلة بعد.</p>
        ) : (
          <>
            <ul className="divide-y">
              {events.map((event) => (
                <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{EVENT_LABELS[event.event] ?? event.event}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{event.risk === "high" ? "مراجعة مطلوبة" : "طبيعي"}</span>
                  </div>
                </li>
              ))}
            </ul>
            {nextCursor && (
              <div className="flex justify-center pt-4">
                <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
                  {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />} تحميل المزيد
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
