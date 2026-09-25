"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/api-client";
import { fetchSecurityEvents } from "@/features/auth/api";
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

/** Compact preview on the security tab — the dialog owns the full history. */
const PREVIEW_COUNT = 3;
const PAGE_LIMIT = 20;

const EVENT_LABELS: Record<string, string> = {
  // Legacy / short names
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
  // Backend audit vocabulary (analytics AuditService + auth handlers)
  AUTH_LOGIN_SUCCESS: "تسجيل دخول ناجح",
  AUTH_LOGIN_FAILURE: "محاولة دخول فاشلة",
  AUTH_MFA_REQUIRED: "طُلب تحقق بخطوتين",
  AUTH_MFA_SUCCESS: "تحقق بخطوتين ناجح",
  AUTH_MFA_FAILURE: "تحقق بخطوتين فاشل",
  AUTH_REFRESH: "تجديد الجلسة",
  AUTH_REFRESH_REUSE_DETECTED: "اشتباه في سرقة الجلسة",
  EMAIL_VERIFIED: "توثيق البريد الإلكتروني",
  PHONE_VERIFIED: "توثيق رقم الهاتف",
  PASSWORD_RESET: "إعادة تعيين كلمة المرور",
  RECOVERY_CODES_REGENERATED: "تجديد رموز الاسترداد",
  PHONE_CHANGED: "تغيير رقم الهاتف",
  SOCIAL_LINKED: "ربط حساب اجتماعي",
  SOCIAL_UNLINKED: "فصل حساب اجتماعي",
  ALL_SESSIONS_REVOKED: "إنهاء جميع الجلسات",
  ACCOUNT_DELETION_REQUESTED: "طلب حذف الحساب",
  ACCOUNT_DELETED: "حذف الحساب",
  "auth.login": "تسجيل دخول",
  "auth.login_failed": "محاولة دخول فاشلة",
  "admin.action": "إجراء إداري",
  "admin.impersonation_start": "انتحال إداري",
  "data.deletion": "حذف بيانات",
};

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("ar-EG");
}

function SecurityEventRow({ event }: { event: SecurityEvent }) {
  const highRisk = event.risk === "high";
  const context = [event.ip, event.userAgent].filter(Boolean).join(" · ");
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${highRisk ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
          {highRisk ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium">{EVENT_LABELS[event.event] ?? event.event}</p>
            <Badge variant={highRisk ? "destructive" : "secondary"} className="shrink-0">
              {highRisk ? "مراجعة مطلوبة" : "طبيعي"}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatTimestamp(event.timestamp)}</p>
          {context && <p className="mt-0.5 truncate text-xs text-muted-foreground" dir="ltr">{context}</p>}
        </div>
      </div>
    </li>
  );
}

export default function SecurityAuditLogCard() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  async function load(cursor?: string) {
    const query = cursor ? `?limit=${PAGE_LIMIT}&cursor=${encodeURIComponent(cursor)}` : `?limit=${PAGE_LIMIT}`;
    const data = await fetchSecurityEvents<SecurityEventsPage>(query);
    setEvents((current) => cursor ? [...current, ...data.events] : data.events);
    setNextCursor(data.nextCursor || null);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching external data on mount/param change; setState in async callback is intentional sync
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

  function retry() {
    setError(null);
    setIsLoading(true);
    load().catch(() => setError("تعذر تحميل سجل الأمان.")).finally(() => setIsLoading(false));
  }

  const preview = events.slice(0, PREVIEW_COUNT);
  const hasMore = events.length > PREVIEW_COUNT || nextCursor !== null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> أحدث أنشطة الأمان
          </CardTitle>
          <CardDescription>آخر تسجيلات الدخول والتغييرات الأمنية على حسابك.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : error && events.length === 0 ? (
            <InlineErrorState message={error} onRetry={retry} />
          ) : events.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد أحداث أمان مسجلة بعد.</p>
          ) : (
            <>
              <ul className="divide-y">
                {preview.map((event) => (
                  <SecurityEventRow key={event.id} event={event} />
                ))}
              </ul>
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                    عرض المزيد {events.length > PREVIEW_COUNT ? `(${events.length})` : ""}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" /> سجل الأمان الكامل
            </DialogTitle>
            <DialogDescription>كل أحداث الأمان الخاصة بحسابك مرتبة من الأحدث.</DialogDescription>
          </DialogHeader>
          <ul className="divide-y max-h-[50vh] overflow-y-auto pe-1">
            {events.map((event) => (
              <SecurityEventRow key={event.id} event={event} />
            ))}
          </ul>
          {nextCursor && (
            <div className="flex justify-center pt-2">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
                {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />} تحميل المزيد
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
