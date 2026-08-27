"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  MessageSquare,
  Heart,
  Star,
  TrendingUp,
  Activity,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from "lucide-react";
import { apiClient, ApiError } from "@/lib/api/api-client";
import { apiRoutes } from "@/lib/api/routes";
import InlineErrorState from "./InlineErrorState";
import { toast } from "sonner";

type ActivityType = "notification" | "message" | "like" | "achievement" | "progress";

interface RawActivity {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: string;
  read?: boolean;
  url?: string;
}

const PAGE_SIZE = 20;

const ACTIVITY_CONFIG: Record<ActivityType, { icon: typeof Bell; color: string; label: string }> = {
  notification: { icon: Bell, color: "bg-blue-500", label: "إشعار" },
  message: { icon: MessageSquare, color: "bg-green-500", label: "رسالة" },
  like: { icon: Heart, color: "bg-red-500", label: "إعجاب" },
  achievement: { icon: Star, color: "bg-yellow-500", label: "إنجاز" },
  progress: { icon: TrendingUp, color: "bg-purple-500", label: "تقدّم" },
};

const DEFAULT_CONFIG = {
  icon: Activity,
  color: "bg-gray-500",
  label: "نشاط",
};

/**
 * Reads from `GET /api/activities/recent?limit=N&offset=N` — that endpoint
 * serves *notifications* rather than a separate audit log, so the displayed
 * activity types are the ones the notifications table produces. The `url`
 * field is honored when present (the activity widget already does this);
 * the handler never returns one, so the link stays a no-op for now.
 */
export default function ActivityLog() {
  const [items, setItems] = useState<RawActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mutatingId, setMutatingId] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  // Initial load (and retries via `token`) — every state update happens in
  // the promise callbacks, never synchronously inside the effect body.
  useEffect(() => {
    const controller = new AbortController();
    apiClient
      .get<{ activities: RawActivity[] } | RawActivity[]>(
        `${apiRoutes.activities.recent}?limit=${PAGE_SIZE}&offset=0`,
        { signal: controller.signal }
      )
      .then((data) => {
        const list = Array.isArray(data) ? data : data.activities ?? [];
        setItems(list);
        setHasMore(list.length === PAGE_SIZE);
        setError(null);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof ApiError ? err.message : "تعذر تحميل سجل النشاط.");
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, [token]);

  async function markRead(id: string) {
    setMutatingId(id);
    const previous = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, read: true } : i)));
    try {
      await apiClient.post(apiRoutes.activities.markRead(id), {});
    } catch {
      setItems(previous);
      toast.error("تعذر تحديث حالة العنصر.");
    } finally {
      setMutatingId(null);
    }
  }

  async function markAllRead() {
    const previous = items;
    setItems((prev) => prev.map((i) => ({ ...i, read: true })));
    try {
      await apiClient.post(apiRoutes.activities.readAll, {});
      toast.success("تم وضع علامة قراءة على الكل.");
    } catch {
      setItems(previous);
      toast.error("تعذر تحديث السجل.");
    }
  }

  async function loadMore() {
    const next = offset + PAGE_SIZE;
    setIsLoadingMore(true);
    try {
      const data = await apiClient.get<{ activities: RawActivity[] } | RawActivity[]>(
        `${apiRoutes.activities.recent}?limit=${PAGE_SIZE}&offset=${next}`
      );
      const list = Array.isArray(data) ? data : data.activities ?? [];
      setOffset(next);
      setItems((prev) => [...prev, ...list]);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("تعذر تحميل المزيد من العناصر.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  function retry() {
    setError(null);
    setIsLoading(true);
    setOffset(0);
    setToken((t) => t + 1);
  }

  const unreadCount = items.filter((i) => !i.read).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center gap-2">
              <Inbox className="w-5 h-5" /> سجل النشاط
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ms-1">
                  {unreadCount} جديد
                </Badge>
              )}
            </CardTitle>
            <CardDescription>آخر الإشعارات والتحديثات على حسابك.</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={markAllRead}
            disabled={isLoading || unreadCount === 0}
          >
            <CheckCheck className="w-3.5 h-3.5" /> قراءة الكل
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : error ? (
          <InlineErrorState message={error} onRetry={retry} />
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center">
            <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">لا توجد أنشطة حتى الآن</p>
            <p className="mt-1 text-sm text-muted-foreground">
              ستظهر هنا آخر الإشعارات والتحديثات فور وصولها.
            </p>
          </div>
        ) : (
          <>
            <ul className="divide-y">
              {items.map((item) => {
                const config = ACTIVITY_CONFIG[item.type] ?? DEFAULT_CONFIG;
                const Icon = config.icon;
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${config.color}`}
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p
                            className={`text-sm ${item.read ? "text-foreground" : "font-semibold text-foreground"} truncate`}
                          >
                            {item.title}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(item.timestamp), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          {!item.read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => markRead(item.id)}
                              disabled={mutatingId === item.id}
                              aria-label="وضع علامة قراءة"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={loadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      جارٍ التحميل…
                    </>
                  ) : (
                    <>
                      <ChevronLeft className="h-3.5 w-3.5" /> تحميل المزيد
                      <ChevronRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
