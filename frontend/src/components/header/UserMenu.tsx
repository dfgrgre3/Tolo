"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMounted } from "@/hooks/use-mounted";

import {
  LogOut,
  Shield,
  CreditCard,
  Moon,
  Sun,
  HelpCircle,
  ChevronRight,
  Crown,
  Loader2,
  Activity,
  Clock,
  UserCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/providers/theme-provider";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { cn, toggleThemeWithTransition } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { saveSettingsPreferences } from "@/lib/settings-preferences";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/api-client";
import { useWebSocket } from "@/contexts/websocket-context";
import { formatDistanceToNow } from "date-fns";

type ThemeMode = "light" | "dark";

// â”€â”€â”€ Activity Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description?: string;
  timestamp: Date;
  read: boolean;
  url?: string;
}

interface UserSubscription {
  plan?: string;
  endDate?: string | null;
  status?: string;
}

interface AuthUser {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
  subscription?: UserSubscription | null;
}

const LOCALE = "ar-EG";
const LOGIN_PATH = "/login";

/**
 * Ø¥Ø°Ø§ ÙƒØ§Ù† logout Ù„Ø¯ÙŠÙƒ ÙŠÙ‚ÙˆÙ… Ø¨Ø§Ù„ØªÙˆØ¬ÙŠÙ‡ ØªÙ„Ù‚Ø§Ø¦ÙŠÙ‹Ø§ØŒ
 * Ø§Ø¬Ø¹Ù„ Ù‡Ø°Ù‡ Ø§Ù„Ù‚ÙŠÙ…Ø© false.
 */
const REDIRECT_AFTER_LOGOUT = true;

const STAFF_ROLES = new Set<string>([
  "ADMIN",
  "MODERATOR",
  "SUPER_ADMIN",
]);

const MENU_LINKS = {
  admin: "/admin",
  help: "/support",
  subscription: "/subscription",
  profile: "/profile",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function asId(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function asDateInput(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    /**
     * Ø¥Ø°Ø§ ÙƒØ§Ù† timestamp Ø¨Ø§Ù„Ø«ÙˆØ§Ù†ÙŠØŒ Ù†Ø­ÙˆÙ„Ù‡ Ø¥Ù„Ù‰ milliseconds.
     */
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return undefined;
}

function getSafeAvatarUrl(url?: string): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim();
  if (!trimmed) return undefined;

  /**
   * Ù…Ù†Ø¹ protocol-relative URLs
   */
  if (trimmed.startsWith("//")) {
    return undefined;
  }

  /**
   * Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ø¯Ø§Ø®Ù„ÙŠØ© Ù…Ø«Ù„ /avatars/1.png
   */
  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  /**
   * Ø§Ù„Ù…Ø³Ø§Ø±Ø§Øª Ø§Ù„Ù†Ø³Ø¨ÙŠØ© Ø§Ù„Ø¨Ø³ÙŠØ·Ø© Ø§Ù„ØªÙŠ Ù„Ø§ ØªØ­ØªÙˆÙŠ Ø¹Ù„Ù‰ protocol
   */
  if (!trimmed.includes(":")) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function normalizeSubscription(value: unknown): UserSubscription | null {
  if (!isRecord(value)) return null;

  const plan = asString(value.plan);
  const endDate = asDateInput(value.endDate);
  const status = asString(value.status)?.toLowerCase();

  if (!plan && !endDate && !status) {
    return null;
  }

  return {
    plan,
    endDate,
    status,
  };
}

function normalizeUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) return null;

  const id = asId(value.id);
  if (!id) return null;

  return {
    id,
    name: asString(value.name),
    username: asString(value.username),
    email: asString(value.email),
    avatar: getSafeAvatarUrl(asString(value.avatar)),
    role: asString(value.role)?.toUpperCase(),
    subscription: normalizeSubscription(value.subscription),
  };
}

function isStaffAdminPanelRole(role?: string): boolean {
  return Boolean(role && STAFF_ROLES.has(role));
}

function getInitials(user: AuthUser): string {
  const source = user.name || user.username || user.email || "";

  const parts = source
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return "ØŸ";
  }

  return parts
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("")
    .toUpperCase();
}

function formatDate(value?: string | null, locale = LOCALE): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
    }).format(date);
  } catch {
    return "";
  }
}

function isSubscriptionActive(subscription?: UserSubscription | null): boolean {
  if (!subscription) return false;

  const status = subscription.status?.toLowerCase();

  let hasValidEndDate = false;
  let isFutureEndDate = false;

  if (subscription.endDate) {
    const date = new Date(subscription.endDate);

    if (!Number.isNaN(date.getTime())) {
      hasValidEndDate = true;
      isFutureEndDate = date.getTime() > Date.now();
    }
  }

  if (status === "active" || status === "trialing") {
    return true;
  }

  if (
    status === "expired" ||
    status === "canceled" ||
    status === "incomplete" ||
    status === "past_due"
  ) {
    return false;
  }

  if (hasValidEndDate) {
    return isFutureEndDate;
  }

  return Boolean(subscription.plan);
}

function getSubscriptionLabel(
  subscription?: UserSubscription | null,
  locale = LOCALE
): string | null {
  if (!subscription) return null;

  const active = isSubscriptionActive(subscription);

  if (!active) {
    return "Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ØºÙŠØ± Ù†Ø´Ø·";
  }

  const endDateLabel = formatDate(subscription.endDate, locale);

  if (!subscription.plan && !endDateLabel) {
    return "Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ Ù†Ø´Ø·";
  }

  if (!endDateLabel) {
    return subscription.plan ?? "";
  }

  if (!subscription.plan) {
    return `ÙŠÙ†ØªÙ‡ÙŠ ${endDateLabel}`;
  }

  return `${subscription.plan} - ÙŠÙ†ØªÙ‡ÙŠ ${endDateLabel}`;
}

function isPremiumUser(user: AuthUser): boolean {
  /**
   * Ø¥Ø°Ø§ ÙƒØ§Ù† Ù„Ø¯ÙŠÙƒ PREMIUM ÙƒØ¯ÙˆØ± Ù‚Ø¯ÙŠÙ…ØŒ Ù†Ø¹Ø±Ø¶Ù‡Ø§.
   * Ù„ÙƒÙ† Ø§Ù„Ø£ÙØ¶Ù„ Ù…Ø³ØªÙ‚Ø¨Ù„Ù‹Ø§ Ø£Ù† ØªÙƒÙˆÙ† Premium Ù…Ù† Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙÙ‚Ø·.
   */
  if (user.role === "PREMIUM") {
    return true;
  }

  const subscription = user.subscription;
  if (!subscription) return false;

  if (!isSubscriptionActive(subscription)) {
    return false;
  }

  const plan = subscription.plan?.toLowerCase() ?? "";

  return (
    plan.includes("premium") ||
    subscription.plan?.includes("Ø¨Ø±ÙŠÙ…ÙŠÙˆÙ…") === true
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function UserMenu() {
  /**
   * Ù†Ø³ØªØ®Ø¯Ù… unknown Ù‡Ù†Ø§ Ù„Ø¬Ø¹Ù„ Ø§Ù„Ù…ÙƒÙˆÙ‘Ù† Ø¢Ù…Ù†Ù‹Ø§ Ø­ØªÙ‰ Ù„Ùˆ ÙƒØ§Ù† useAuth ØºÙŠØ± Ù…Ø¶Ø¨ÙˆØ· Ø§Ù„Ù†ÙˆØ¹ 100%.
   * Ø¥Ø°Ø§ ÙƒØ§Ù† useAuth Ù„Ø¯ÙŠÙƒ typed Ø¨Ø§Ù„ÙƒØ§Ù…Ù„ØŒ ÙŠÙ…ÙƒÙ†Ùƒ Ø¥Ø²Ø§Ù„Ø© Ù‡Ø°Ù‡ Ø§Ù„Ù€ casts Ù„Ø§Ø­Ù‚Ù‹Ø§.
   */
  const { user, isLoading: authIsLoading, logout } = useAuth();
  const { socket, isConnected } = useWebSocket() as { socket: WebSocket | null; isConnected: boolean };

  const themeContext = useTheme() as {
    theme?: unknown;
    resolvedTheme?: unknown;
    setTheme?: unknown;
  };

  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const mounted = useMounted();

  // â”€â”€â”€ Activity State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [actUnreadCount, setActUnreadCount] = useState(0);

  const activityIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const data = await apiClient.get<RawActivity[] | { activities: RawActivity[] }>(
        "/activities/recent?limit=8"
      );
      const rawList = Array.isArray(data) ? data : (data?.activities ?? []);
      const items: ActivityItem[] = rawList.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        timestamp: new Date(item.timestamp),
        read: item.read ?? false,
        url: item.url,
      }));
      setActivities(items);
      setActUnreadCount(items.filter((a) => !a.read).length);
    } catch (error) {
      logger.debug("[UserMenu] Failed to fetch activities:", error);
    }
  }, []);

  const markActivityAsRead = useCallback(async (id: string) => {
    try {
      await apiClient.post(`/activities/${id}/read`, {});
      setActivities((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      setActUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.debug("[UserMenu] Failed to mark activity as read:", error);
    }
  }, []);

  const isMountedRef = useRef(true);
  const logoutLockRef = useRef(false);
  const themeRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // â”€â”€â”€ Fetch Activities on open / WS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!mounted || !user?.id) return;

    const idleId = typeof window !== 'undefined' && 'requestIdleCallback' in window
      ? window.requestIdleCallback(() => fetchActivities(), { timeout: 3000 })
      : setTimeout(() => fetchActivities(), 1000);

    if (!isConnected) {
      activityIntervalRef.current = setInterval(fetchActivities, 300_000);
    }

    const handleWsMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        if (["notification", "refresh_notifications", "activity_refresh"].includes(data.type)) {
          fetchActivities();
        }
      } catch {
        // ignore
      }
    };

    if (socket) socket.addEventListener("message", handleWsMessage);

    return () => {
      if (typeof window !== 'undefined' && 'cancelIdleCallback' in window && typeof idleId === 'number') {
        window.cancelIdleCallback(idleId);
      } else {
        clearTimeout(idleId as any);
      }
      if (activityIntervalRef.current) clearInterval(activityIntervalRef.current);
      if (socket) socket.removeEventListener("message", handleWsMessage);
    };
  }, [mounted, user?.id, isConnected, socket, fetchActivities]);

  useEffect(() => {
    queueMicrotask(() => {
      setOpen(false);
    });
  }, [pathname]);

  const normalizedUser = useMemo(() => normalizeUser(user as unknown), [user]);

  const isLoading = authIsLoading;

  const setThemeFn = useMemo(() => {
    if (typeof themeContext.setTheme !== "function") {
      return undefined;
    }

    return themeContext.setTheme as (theme: string) => void;
  }, [themeContext.setTheme]);

  const activeTheme = mounted
    ? typeof themeContext.resolvedTheme === "string"
      ? themeContext.resolvedTheme
      : typeof themeContext.theme === "string"
        ? themeContext.theme
        : undefined
    : undefined;

  const isDark = activeTheme === "dark";

  const initials = useMemo(() => {
    return normalizedUser ? getInitials(normalizedUser) : "";
  }, [normalizedUser]);

  const subscriptionLabel = useMemo(() => {
    return normalizedUser ? getSubscriptionLabel(normalizedUser.subscription) : null;
  }, [normalizedUser]);

  const premium = useMemo(() => {
    return normalizedUser ? isPremiumUser(normalizedUser) : false;
  }, [normalizedUser]);

  const primaryName =
    normalizedUser?.name || normalizedUser?.username || normalizedUser?.email || "Ù…Ø³ØªØ®Ø¯Ù…";

  const secondaryText =
    normalizedUser?.email && normalizedUser.email !== primaryName
      ? normalizedUser.email
      : normalizedUser?.username && normalizedUser.username !== primaryName
        ? normalizedUser.username
        : undefined;

  const toggleTheme = useCallback(() => {
    if (!setThemeFn) return;

    const nextTheme: ThemeMode = isDark ? "light" : "dark";

    try {
      toggleThemeWithTransition(nextTheme, setThemeFn, undefined);
    } catch (error) {
      logger.error("Theme transition failed:", getErrorMessage(error));
      setThemeFn(nextTheme);
    }

    if (!normalizedUser?.id) return;

    const requestId = ++themeRequestIdRef.current;

    void saveSettingsPreferences({
      appearance: {
        theme: nextTheme,
      },
    }).catch((error: unknown) => {
      if (requestId !== themeRequestIdRef.current) return;
      if (!isMountedRef.current) return;

      logger.error(
        "Failed to sync theme preference in UserMenu:",
        getErrorMessage(error)
      );

      toast.error("ØªØ¹Ø°Ø± Ø­ÙØ¸ ØªÙØ¶ÙŠÙ„Ø§Øª Ø§Ù„Ù…Ø¸Ù‡Ø±");
    });
  }, [isDark, setThemeFn, normalizedUser?.id]);

  const handleLogout = useCallback(async () => {
    if (logoutLockRef.current || isLoggingOut) return;

    logoutLockRef.current = true;
    setIsLoggingOut(true);

    /**
     * Ø¥ÙŠÙ‚Ø§Ù ØªØ¬Ø§Ù‡Ù„ Ø£ÙŠ Ø·Ù„Ø¨Ø§Øª Ø­ÙØ¸ Ø«ÙŠÙ… Ù‚Ø¯ÙŠÙ…Ø© Ø¹Ù†Ø¯ Ø§Ù„Ø®Ø±ÙˆØ¬.
     */
    themeRequestIdRef.current += 1;

    try {
      if (typeof logout !== "function") {
        throw new Error("Logout function is not available");
      }

      await logout();

      toast.success("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ Ø¨Ù†Ø¬Ø§Ø­");

      if (isMountedRef.current) {
        setOpen(false);
      }

      if (REDIRECT_AFTER_LOGOUT) {
        router.replace(LOGIN_PATH);
      }
    } catch (error) {
      logger.error("Logout failed:", getErrorMessage(error));
      toast.error("ØªØ¹Ø°Ø± ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬ØŒ Ø­Ø§ÙˆÙ„ Ù…Ø±Ø© Ø£Ø®Ø±Ù‰");
    } finally {
      logoutLockRef.current = false;

      if (isMountedRef.current) {
        setIsLoggingOut(false);
      }
    }
  }, [logout, isLoggingOut, router]);

  if (isLoading) {
    return (
      <div
        role="status"
        aria-label="Ø¬Ø§Ø±Ù ØªØ­Ù…ÙŠÙ„ Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…"
        className="h-10 w-10 animate-pulse rounded-full bg-muted"
      />
    );
  }

  if (!normalizedUser) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="relative h-8 w-8 touch-manipulation overflow-hidden rounded-full border-2 border-primary/10 p-0 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 group sm:h-9 sm:w-9 md:h-10 md:w-10"
          aria-label={`Ù‚Ø§Ø¦Ù…Ø© Ø§Ù„Ù…Ø³ØªØ®Ø¯Ù…: ${primaryName}`}
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={normalizedUser.avatar || undefined} alt="" />
            <AvatarFallback className="bg-gradient-to-br from-primary/10 to-primary/5 text-sm font-bold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/*
            Ù†Ù‚Ø·Ø© Ø§Ù„Ø­Ø§Ù„Ø©:
            Ø¥Ø°Ø§ Ù„Ù… ØªÙƒÙ† Ø­Ø§Ù„Ø© Ø§Ù„Ø§ØªØµØ§Ù„ Ø­Ù‚ÙŠÙ‚ÙŠØ© Ù…Ù† Ø§Ù„Ø³ÙŠØ±ÙØ±ØŒ
            Ø§Ù„Ø£ÙØ¶Ù„ Ø¥Ø²Ø§Ù„ØªÙ‡Ø§ Ø£Ùˆ Ø±Ø¨Ø·Ù‡Ø§ Ø¨Ø¨ÙŠØ§Ù†Ø§Øª presence.
          */}
          <span
            className="absolute bottom-0 end-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background"
            aria-hidden="true"
          />

          <div
            className="pointer-events-none absolute inset-0 rounded-full bg-primary/5 opacity-0 group-hover:opacity-100"
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={8}
        className="w-72 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="max-w-[12rem] truncate text-sm font-bold leading-none">
                {primaryName}
              </p>

              {normalizedUser.role === "SUPER_ADMIN" && (
                <Badge
                  variant="outline"
                  className="gap-1 px-1.5 py-0 text-[10px]"
                >
                  <Crown className="h-2.5 w-2.5" aria-hidden="true" />
                  Ù…Ø¯ÙŠØ± Ø¹Ø§Ù…
                </Badge>
              )}

              {normalizedUser.role === "ADMIN" && (
                <Badge
                  variant="destructive"
                  className="gap-1 px-1.5 py-0 text-[10px]"
                >
                  <Crown className="h-2.5 w-2.5" aria-hidden="true" />
                  Ù…Ø³Ø¤ÙˆÙ„
                </Badge>
              )}

              {normalizedUser.role === "MODERATOR" && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-[10px]"
                >
                  <Shield className="h-2.5 w-2.5" aria-hidden="true" />
                  Ù…Ø±Ø§Ù‚Ø¨
                </Badge>
              )}

              {premium && (
                <Badge className="gap-1 border-transparent bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0 text-[10px] text-white dark:from-amber-600 dark:to-amber-700">
                  <Crown className="h-2.5 w-2.5" aria-hidden="true" />
                  Ù…Ù…ÙŠØ²
                </Badge>
              )}
            </div>

            {secondaryText && (
              <p className="max-w-[15rem] truncate text-xs leading-none text-muted-foreground">
                {secondaryText}
              </p>
            )}

            {subscriptionLabel && (
              <p
                className="truncate text-xs font-medium text-primary"
                suppressHydrationWarning
              >
                {subscriptionLabel}
              </p>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {isStaffAdminPanelRole(normalizedUser.role) && (
            <DropdownMenuItem
              asChild
              className="cursor-pointer gap-2.5 py-2.5 font-bold touch-manipulation"
            >
              <Link href={MENU_LINKS.admin} prefetch={false}>
                <Shield
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                <span>Ù„ÙˆØ­Ø© Ø§Ù„Ø¥Ø¯Ø§Ø±Ø©</span>
                <ChevronRight
                  className="h-3.5 w-3.5 ms-auto opacity-50 rtl:-scale-x-100"
                  aria-hidden="true"
                />
              </Link>
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {/* â”€â”€â”€ Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ± â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer gap-2.5 py-2.5 touch-manipulation">
              <Activity className="h-4 w-4 text-primary" aria-hidden="true" />
              <span>Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ±</span>
              {actUnreadCount > 0 && (
                <span className="ms-auto inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {actUnreadCount > 9 ? "9+" : actUnreadCount}
                </span>
              )}
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent
              sideOffset={8}
              collisionPadding={8}
              className="w-72 p-0"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/40">
                <span className="text-xs font-semibold text-foreground">Ø§Ù„Ù†Ø´Ø§Ø· Ø§Ù„Ø£Ø®ÙŠØ±</span>
                {actUnreadCount > 0 && (
                  <span className="text-[10px] text-muted-foreground">({actUnreadCount} Ø¬Ø¯ÙŠØ¯)</span>
                )}
              </div>

              {/* List */}
              <div className="max-h-60 overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="py-6 text-center">
                    <Activity className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" aria-hidden="true" />
                    <p className="text-xs text-muted-foreground">Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù†Ø´Ø§Ø· Ø­ØªÙ‰ Ø§Ù„Ø¢Ù†</p>
                  </div>
                ) : (
                  <div className="p-1.5 space-y-0.5">
                    {activities.slice(0, 5).map((activity) => (
                      <DropdownMenuItem
                        key={activity.id}
                        onClick={() => markActivityAsRead(activity.id)}
                        className={cn(
                          "flex items-start gap-2.5 p-2.5 rounded-lg cursor-pointer",
                          !activity.read && "bg-primary/5 border-r-2 border-primary rtl:border-r-0 rtl:border-l-2"
                        )}
                      >
                        <div className="flex items-center justify-center h-7 w-7 rounded-md bg-muted shrink-0">
                          <Activity className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{activity.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-2.5 w-2.5 text-muted-foreground shrink-0" aria-hidden="true" />
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        {!activity.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1" aria-label="ØºÙŠØ± Ù…Ù‚Ø±ÙˆØ¡" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {activities.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer justify-center text-xs py-2 touch-manipulation"
                  >
                    <Link href="/activities" prefetch={false}>Ø¹Ø±Ø¶ Ø¬Ù…ÙŠØ¹ Ø§Ù„Ù†Ø´Ø§Ø·</Link>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-2.5 py-2.5 touch-manipulation"
          >
            <Link href={MENU_LINKS.profile} prefetch={false}>
              <UserCircle
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>Ø§Ù„Ù…Ù„Ù Ø§Ù„Ø´Ø®ØµÙŠ ÙˆØ§Ù„Ø¥Ø¹Ø¯Ø§Ø¯Ø§Øª</span>
              <ChevronRight
                className="h-3.5 w-3.5 ms-auto opacity-50 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer gap-2.5 py-2.5 touch-manipulation"
            onSelect={toggleTheme}
            disabled={!setThemeFn || isLoggingOut}
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-primary" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            <span>ØªØ¨Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø¸Ù‡Ø±</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-2.5 py-2.5 touch-manipulation"
          >
            <Link href={MENU_LINKS.help} prefetch={false}>
              <HelpCircle
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>Ø§Ù„Ù…Ø³Ø§Ø¹Ø¯Ø© ÙˆØ§Ù„Ø¯Ø¹Ù…</span>
              <ChevronRight
                className="h-3.5 w-3.5 ms-auto opacity-50 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem
            asChild
            className="cursor-pointer gap-2.5 py-2.5 touch-manipulation"
          >
            <Link href={MENU_LINKS.subscription} prefetch={false}>
              <CreditCard
                className="h-4 w-4 text-primary"
                aria-hidden="true"
              />
              <span>Ø§Ù„Ø§Ø´ØªØ±Ø§Ùƒ ÙˆØ§Ù„ÙÙˆØ§ØªÙŠØ±</span>
              <ChevronRight
                className="h-3.5 w-3.5 ms-auto opacity-50 rtl:-scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className={cn(
            "cursor-pointer gap-2.5 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive touch-manipulation",
            isLoggingOut && "cursor-not-allowed opacity-50"
          )}
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
          disabled={isLoggingOut}
          aria-busy={isLoggingOut || undefined}
        >
          {isLoggingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <LogOut className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {isLoggingOut ? "Ø¬Ø§Ø±ÙŠ ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬..." : "ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø®Ø±ÙˆØ¬"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}