'use client';

import {
  SettingsPreferences,
  SettingsPreferencesPatch,
  DEFAULT_APPEARANCE_SETTINGS,
  DEFAULT_LANGUAGE_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '@/types/user-ui-preferences';

import apiClient from '@/lib/api/api-client';
import { apiRoutes } from '@/lib/api/routes';
import { logger } from '@/lib/logger';

type PreferencesResponse = {
  success?: boolean;
  data?: {
    settings?: unknown;
  };
};

type SettingsRecord = Record<string, unknown>;

function asSettingsRecord(value: unknown): SettingsRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as SettingsRecord
    : null;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    logger.debug('[parseErrorMessage]', { status: response.status, body: text });

    try {
      const payload = JSON.parse(text);
      
      if (typeof payload?.error === 'string') {
        return payload.error;
      }
      if (typeof payload?.message === 'string') {
        return payload.message;
      }
      if (typeof payload?.msg === 'string') {
        return payload.msg;
      }
      if (typeof payload?.details === 'string') {
        return payload.details;
      }
      if (payload?.success === false && typeof payload?.error !== 'string') {
        return `Backend error (${response.status})`;
      }
    } catch {
      return text.substring(0, 500);
    }
  } catch (err) {
    logger.error('[parseErrorMessage] Failed to read response body', { err });
  }

  return `Failed to process settings request (HTTP ${response.status})`;
}

function mapBackendToFrontend(rawSettings: unknown): SettingsPreferences {
  const settings = asSettingsRecord(rawSettings);
  if (!settings) return {
    appearance: DEFAULT_APPEARANCE_SETTINGS,
    language: DEFAULT_LANGUAGE_SETTINGS,
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    privacy: DEFAULT_PRIVACY_SETTINGS,
  };

  const readString = (key: string, fallback: string): string =>
    typeof settings[key] === 'string' ? settings[key] as string : fallback;
  const readBoolean = (key: string, fallback: boolean): boolean =>
    typeof settings[key] === 'boolean' ? settings[key] as boolean : fallback;
  const readNumber = (key: string, fallback: number): number =>
    typeof settings[key] === 'number' ? settings[key] as number : fallback;
  const readEnum = <T extends string>(key: string, values: readonly T[], fallback: T): T => {
    const value = settings[key];
    return typeof value === 'string' && values.includes(value as T) ? value as T : fallback;
  };
  
  return {
    appearance: {
      ...DEFAULT_APPEARANCE_SETTINGS,
      theme: readEnum('theme', ['light', 'dark', 'system'], DEFAULT_APPEARANCE_SETTINGS.theme),
      fontSize: readEnum('fontSize', ['small', 'medium', 'large'], DEFAULT_APPEARANCE_SETTINGS.fontSize),
      reducedMotion: readBoolean('reducedMotion', DEFAULT_APPEARANCE_SETTINGS.reducedMotion),
      highContrast: readBoolean('highContrast', DEFAULT_APPEARANCE_SETTINGS.highContrast),
      compactMode: readBoolean('compactMode', DEFAULT_APPEARANCE_SETTINGS.compactMode ?? false),
      efficiencyMode: readBoolean('efficiencyMode', DEFAULT_APPEARANCE_SETTINGS.efficiencyMode ?? false),
    },
    language: {
      ...DEFAULT_LANGUAGE_SETTINGS,
      language: readString('language', DEFAULT_LANGUAGE_SETTINGS.language),
      numberFormat: readEnum('numberFormat', ['arabic', 'western'], DEFAULT_LANGUAGE_SETTINGS.numberFormat),
    },
    notifications: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notificationsEnabled: readBoolean('notificationsEnabled', DEFAULT_NOTIFICATION_SETTINGS.notificationsEnabled),
      studyReminders: readBoolean('studyReminders', DEFAULT_NOTIFICATION_SETTINGS.studyReminders),
      emailNotifications: readBoolean('emailNotifications', DEFAULT_NOTIFICATION_SETTINGS.emailNotifications),
      pushNotifications: readBoolean('pushNotifications', DEFAULT_NOTIFICATION_SETTINGS.pushNotifications),
      taskReminders: readBoolean('taskReminders', DEFAULT_NOTIFICATION_SETTINGS.taskReminders),
      taskReminderTime: readString('taskReminderTime', DEFAULT_NOTIFICATION_SETTINGS.taskReminderTime),
      dailyGoalReminders: readBoolean('dailyGoalReminders', DEFAULT_NOTIFICATION_SETTINGS.dailyGoalReminders),
      examReminders: readBoolean('examReminders', DEFAULT_NOTIFICATION_SETTINGS.examReminders),
      examReminderDays: readNumber('examReminderDays', DEFAULT_NOTIFICATION_SETTINGS.examReminderDays),
      deadlineReminders: readBoolean('deadlineReminders', DEFAULT_NOTIFICATION_SETTINGS.deadlineReminders),
      progressReports: readBoolean('progressReports', DEFAULT_NOTIFICATION_SETTINGS.progressReports),
      weeklyReport: readBoolean('weeklyReport', DEFAULT_NOTIFICATION_SETTINGS.weeklyReport),
      achievementAlerts: readBoolean('achievementAlerts', DEFAULT_NOTIFICATION_SETTINGS.achievementAlerts),
      commentNotifications: readBoolean('commentNotifications', DEFAULT_NOTIFICATION_SETTINGS.commentNotifications),
      mentionNotifications: readBoolean('mentionNotifications', DEFAULT_NOTIFICATION_SETTINGS.mentionNotifications),
      pushEnabled: readBoolean('pushEnabled', DEFAULT_NOTIFICATION_SETTINGS.pushEnabled),
      emailEnabled: readBoolean('emailEnabled', DEFAULT_NOTIFICATION_SETTINGS.emailEnabled),
      smsEnabled: readBoolean('smsEnabled', DEFAULT_NOTIFICATION_SETTINGS.smsEnabled),
      quietHoursEnabled: readBoolean('quietHoursEnabled', DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnabled),
      quietHoursStart: readString('quietHoursStart', DEFAULT_NOTIFICATION_SETTINGS.quietHoursStart),
      quietHoursEnd: readString('quietHoursEnd', DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnd),
      soundEnabled: readBoolean('soundEnabled', DEFAULT_NOTIFICATION_SETTINGS.soundEnabled),
      vibrationEnabled: readBoolean('vibrationEnabled', DEFAULT_NOTIFICATION_SETTINGS.vibrationEnabled),
    },
    privacy: {
      ...DEFAULT_PRIVACY_SETTINGS,
      profileVisibility: readEnum('profileVisibility', ['public', 'friends', 'private'], DEFAULT_PRIVACY_SETTINGS.profileVisibility),
      showOnlineStatus: readBoolean('showOnlineStatus', DEFAULT_PRIVACY_SETTINGS.showOnlineStatus),
      showProgress: readBoolean('showProgress', DEFAULT_PRIVACY_SETTINGS.showProgress),
      showLastSeen: readBoolean('showLastSeen', DEFAULT_PRIVACY_SETTINGS.showLastSeen ?? false),
      showAchievements: readBoolean('showAchievements', DEFAULT_PRIVACY_SETTINGS.showAchievements ?? false),
      allowMessages: readEnum<'everyone' | 'friends' | 'none'>('allowMessages', ['everyone', 'friends', 'none'], DEFAULT_PRIVACY_SETTINGS.allowMessages ?? 'everyone'),
      allowFriendRequests: readBoolean('allowFriendRequests', DEFAULT_PRIVACY_SETTINGS.allowFriendRequests ?? false),
      dataCollection: readBoolean('dataCollection', DEFAULT_PRIVACY_SETTINGS.dataCollection ?? false),
      personalization: readBoolean('personalization', DEFAULT_PRIVACY_SETTINGS.personalization ?? false),
      analytics: readBoolean('analytics', DEFAULT_PRIVACY_SETTINGS.analytics ?? false),
    }
  };
}

function mapFrontendPatchToBackend(patch: SettingsPreferencesPatch): Record<string, unknown> {
  const flat: Record<string, unknown> = {};
  if (patch.appearance) Object.assign(flat, patch.appearance);
  if (patch.language) Object.assign(flat, patch.language);
  if (patch.notifications) Object.assign(flat, patch.notifications);
  if (patch.privacy) Object.assign(flat, patch.privacy);
  return flat;
}

type FetchLike = (input: RequestInfo, init?: RequestInit) => Promise<Response>;

export async function fetchSettingsPreferences(
  fetchFn: FetchLike = (input, init) => apiClient.fetch(input as string, init)
): Promise<SettingsPreferences> {
  const response = await fetchFn(apiRoutes.settings.preferences, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  } as RequestInit);

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const payload = (await response.json()) as unknown as PreferencesResponse;
  return mapBackendToFrontend(payload?.data?.settings);
}

export async function saveSettingsPreferences(
  patch: SettingsPreferencesPatch,
  fetchFn: FetchLike = (input, init) => apiClient.fetch(input as string, init)
): Promise<SettingsPreferences> {
  const flatPatch = mapFrontendPatchToBackend(patch);
  logger.debug('[saveSettingsPreferences] sending patch', flatPatch);

  const response = await fetchFn(apiRoutes.settings.preferences, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flatPatch),
  } as RequestInit);

  if (!response.ok) {
    const errorMsg = await parseErrorMessage(response);
    logger.error('[saveSettingsPreferences] Request failed', { status: response.status, errorMsg });
    throw new Error(errorMsg);
  }

  const payload = (await response.json()) as unknown as PreferencesResponse;
  return mapBackendToFrontend(payload?.data?.settings);
}
