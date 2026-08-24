'use client';

/**
 * useSessions — single source of truth for the authenticated user's active
 * sessions/devices ( GET/DELETE /api/auth/sessions[/:id] ).
 *
 * Both `settings/devices/page.tsx` and `settings/security/page.tsx` used to
 * each fetch and revoke sessions independently. That drifted: devices'
 * "logout all" only called the local `logout()` (ending the current session
 * only) while security's correctly called `DELETE /api/auth/sessions`
 * (revoking every *other* session). Centralizing here means both pages
 * share one correct implementation.
 *
 * Does not auto-fetch on mount — call `refresh()` from the consuming page's
 * own `useEffect` so each page controls its own loading/error UI.
 */

import { useCallback, useState } from 'react';
import apiClient, { ApiError } from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';

export type SessionApiRecord = {
  id: string;
  userAgent: string;
  ip: string;
  deviceInfo: string | null;
  createdAt: string;
  lastAccessed: string;
  expiresAt: string;
  isCurrent: boolean;
  location: string | null;
};

export type Device = {
  id: string;
  name: string;
  type: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  ip: string;
  location: string;
  lastActive: Date | null;
  isCurrent: boolean;
};

type ParsedDeviceInfo = {
  name?: string;
  browser?: string;
  os?: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
};

function detectDevice(ua: string): { browser: string; os: string; type: Device['type'] } {
  const value = ua.toLowerCase();

  let browser = 'Unknown';
  if (value.includes('edg/')) browser = 'Edge';
  else if (value.includes('chrome/') && !value.includes('edg/')) browser = 'Chrome';
  else if (value.includes('firefox/')) browser = 'Firefox';
  else if (value.includes('safari/') && !value.includes('chrome/')) browser = 'Safari';

  let os = 'Unknown OS';
  if (value.includes('windows')) os = 'Windows';
  else if (value.includes('mac os')) os = 'macOS';
  else if (value.includes('android')) os = 'Android';
  else if (value.includes('iphone') || value.includes('ipad') || value.includes('ios')) os = 'iOS';
  else if (value.includes('linux')) os = 'Linux';

  let type: Device['type'] = 'desktop';
  if (value.includes('ipad') || value.includes('tablet')) type = 'tablet';
  else if (value.includes('mobile') || value.includes('android') || value.includes('iphone')) type = 'mobile';

  return { browser, os, type };
}

function parseDeviceInfo(raw: string | null): ParsedDeviceInfo {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as ParsedDeviceInfo;
  } catch {
    return {};
  }
}

function mapSessionToDevice(session: SessionApiRecord): Device {
  const info = parseDeviceInfo(session.deviceInfo);
  const fallback = detectDevice(session.userAgent || '');
  const type = info.deviceType ?? fallback.type;
  const browser = info.browser ?? fallback.browser;
  const os = info.os ?? fallback.os;
  const name = info.name ?? `${browser} على ${os}`;

  // Validate the date to avoid "Invalid time value" errors downstream.
  let lastActive: Date | null = null;
  if (session.lastAccessed) {
    const parsedDate = new Date(session.lastAccessed);
    if (!isNaN(parsedDate.getTime())) {
      lastActive = parsedDate;
    }
  }

  return {
    id: session.id,
    name,
    type,
    browser,
    os,
    ip: session.ip || 'unknown',
    location: session.location || 'غير محدد',
    lastActive,
    isCurrent: session.isCurrent,
  };
}

export function useSessions() {
  const [sessions, setSessions] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const refresh = useCallback(async (refreshOnly = false) => {
    if (refreshOnly) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const payload = await apiClient.get<{ sessions?: SessionApiRecord[] }>(apiRoutes.auth.sessions);
      const mapped = Array.isArray(payload.sessions) ? payload.sessions.map(mapSessionToDevice) : [];
      setSessions(mapped);
    } catch (error: unknown) {
      const message = error instanceof ApiError || error instanceof Error ? error.message : 'فشل تحميل الأجهزة المتصلة';
      throw new Error(message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const revokeSession = useCallback(async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await apiClient.delete(apiRoutes.auth.revokeSession(sessionId));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } finally {
      setRevokingId(null);
    }
  }, []);

  /** Revokes every OTHER session server-side. Does not end the current session. */
  const revokeAll = useCallback(async () => {
    setIsRevokingAll(true);
    try {
      await apiClient.delete(apiRoutes.auth.revokeAllSessions);
      setSessions((prev) => prev.filter((s) => s.isCurrent));
    } finally {
      setIsRevokingAll(false);
    }
  }, []);

  return {
    sessions,
    isLoading,
    isRefreshing,
    revokingId,
    isRevokingAll,
    refresh,
    revokeSession,
    revokeAll,
  };
}
