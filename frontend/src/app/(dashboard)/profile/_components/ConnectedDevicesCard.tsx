"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Laptop, Smartphone, Monitor, LogOut, Loader2 } from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import { formatArabicDate } from "./profile.constants";
import InlineErrorState from "./InlineErrorState";

/**
 * `GET /api/auth/sessions` returns `UserSession` rows (matches
 * `internal/domain/common/session.go`) enriched with `isCurrent` by
 * `SessionHandler.ListSessions` (backend/internal/infrastructure/api/handlers
 * /protected/session_handler.go) — never the raw refresh token itself.
 */
interface DeviceSession {
  id: string;
  userAgent: string;
  deviceType: string;
  browser: string;
  os: string;
  ip: string;
  country: string;
  location: string | null;
  lastActive: string;
  isCurrent: boolean;
}

function deviceIcon(deviceType: string) {
  const t = deviceType.toLowerCase();
  if (t.includes("mobile") || t.includes("phone")) return Smartphone;
  if (t.includes("desktop") || t.includes("pc")) return Monitor;
  return Laptop;
}

export default function ConnectedDevicesCard() {
  const [sessions, setSessions] = useState<DeviceSession[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [token, setToken] = useState(0);

  // State updates happen only in the promise callbacks — never synchronously
  // inside the effect body.
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<DeviceSession[]>(apiRoutes.auth.sessions.list, { signal: controller.signal })
      .then((data) => {
        setSessions(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("تعذر تحميل الأجهزة المتصلة.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [token]);

  function retry() {
    setError(null);
    setIsLoading(true);
    setToken((t) => t + 1);
  }

  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      await apiClient.delete(apiRoutes.auth.sessions.revoke(id));
      setSessions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      toast.success("تم إنهاء الجلسة");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر إنهاء الجلسة، حاول مرة أخرى.";
      toast.error(message);
    } finally {
      setRevokingId(null);
    }
  }

  async function handleRevokeOthers() {
    setRevokingAll(true);
    try {
      await apiClient.post(apiRoutes.auth.sessions.revokeOthers, {});
      setSessions((prev) => (prev ? prev.filter((s) => s.isCurrent) : prev));
      toast.success("تم إنهاء الجلسات الأخرى");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "تعذر إنهاء الجلسات، حاول مرة أخرى.";
      toast.error(message);
    } finally {
      setRevokingAll(false);
    }
  }

  const otherSessionsCount = sessions?.filter((s) => !s.isCurrent).length ?? 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Laptop className="w-5 h-5" /> الأجهزة المتصلة
            </CardTitle>
            <CardDescription>راجع الجلسات النشطة على حسابك وأغلق ما لا تعرفه.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : error ? (
          <InlineErrorState message={error} onRetry={retry} />
        ) : !sessions || sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد جلسات نشطة حالياً.</p>
        ) : (
          <ul className="space-y-3">
            {sessions.map((s) => {
              const Icon = deviceIcon(s.deviceType);
              const lastActive = formatArabicDate(s.lastActive);
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {s.browser || "متصفح غير معروف"} · {s.os || "نظام غير معروف"}
                        </span>
                        {s.isCurrent && (
                          <Badge variant="secondary" className="shrink-0">
                            هذا الجهاز
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {[s.location || s.country, lastActive && `آخر نشاط ${lastActive}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
                      disabled={revokingId === s.id}
                      onClick={() => handleRevoke(s.id)}
                    >
                      {revokingId === s.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                      إنهاء
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Button
          variant="outline"
          className="gap-2"
          disabled={isLoading || revokingAll || otherSessionsCount === 0}
          onClick={handleRevokeOthers}
        >
          {revokingAll && <Loader2 className="w-4 h-4 animate-spin" />}
          <LogOut className="w-4 h-4" /> إنهاء الجلسات الأخرى
        </Button>
      </CardContent>
    </Card>
  );
}
