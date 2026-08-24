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
    settings: any;
  };
};

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

function mapBackendToFrontend(settings: any): SettingsPreferences {
  if (!settings) return {
    appearance: DEFAULT_APPEARANCE_SETTINGS,
    language: DEFAULT_LANGUAGE_SETTINGS,
    notifications: DEFAULT_NOTIFICATION_SETTINGS,
    privacy: DEFAULT_PRIVACY_SETTINGS,
  };
  
  return {
    appearance: {
      ...DEFAULT_APPEARANCE_SETTINGS,
      theme: settings.theme || DEFAULT_APPEARANCE_SETTINGS.theme,
      fontSize: settings.fontSize || DEFAULT_APPEARANCE_SETTINGS.fontSize,
      reducedMotion: settings.reducedMotion ?? DEFAULT_APPEARANCE_SETTINGS.reducedMotion,
      highContrast: settings.highContrast ?? DEFAULT_APPEARANCE_SETTINGS.highContrast,
      compactMode: settings.compactMode ?? DEFAULT_APPEARANCE_SETTINGS.compactMode,
      efficiencyMode: settings.efficiencyMode ?? DEFAULT_APPEARANCE_SETTINGS.efficiencyMode,
    },
    language: {
      ...DEFAULT_LANGUAGE_SETTINGS,
      language: settings.language || DEFAULT_LANGUAGE_SETTINGS.language,
      numberFormat: settings.numberFormat || DEFAULT_LANGUAGE_SETTINGS.numberFormat,
    },
    notifications: {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      notificationsEnabled: settings.notificationsEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.notificationsEnabled,
      studyReminders: settings.studyReminders ?? DEFAULT_NOTIFICATION_SETTINGS.studyReminders,
      emailNotifications: settings.emailNotifications ?? DEFAULT_NOTIFICATION_SETTINGS.emailNotifications,
      pushNotifications: settings.pushNotifications ?? DEFAULT_NOTIFICATION_SETTINGS.pushNotifications,
      taskReminders: settings.taskReminders ?? DEFAULT_NOTIFICATION_SETTINGS.taskReminders,
      taskReminderTime: settings.taskReminderTime || DEFAULT_NOTIFICATION_SETTINGS.taskReminderTime,
      dailyGoalReminders: settings.dailyGoalReminders ?? DEFAULT_NOTIFICATION_SETTINGS.dailyGoalReminders,
      examReminders: settings.examReminders ?? DEFAULT_NOTIFICATION_SETTINGS.examReminders,
      examReminderDays: settings.examReminderDays ?? DEFAULT_NOTIFICATION_SETTINGS.examReminderDays,
      deadlineReminders: settings.deadlineReminders ?? DEFAULT_NOTIFICATION_SETTINGS.deadlineReminders,
      progressReports: settings.progressReports ?? DEFAULT_NOTIFICATION_SETTINGS.progressReports,
      weeklyReport: settings.weeklyReport ?? DEFAULT_NOTIFICATION_SETTINGS.weeklyReport,
      achievementAlerts: settings.achievementAlerts ?? DEFAULT_NOTIFICATION_SETTINGS.achievementAlerts,
      commentNotifications: settings.commentNotifications ?? DEFAULT_NOTIFICATION_SETTINGS.commentNotifications,
      mentionNotifications: settings.mentionNotifications ?? DEFAULT_NOTIFICATION_SETTINGS.mentionNotifications,
      pushEnabled: settings.pushEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.pushEnabled,
      emailEnabled: settings.emailEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.emailEnabled,
      smsEnabled: settings.smsEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.smsEnabled,
      quietHoursEnabled: settings.quietHoursEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnabled,
      quietHoursStart: settings.quietHoursStart || DEFAULT_NOTIFICATION_SETTINGS.quietHoursStart,
      quietHoursEnd: settings.quietHoursEnd || DEFAULT_NOTIFICATION_SETTINGS.quietHoursEnd,
      soundEnabled: settings.soundEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.soundEnabled,
      vibrationEnabled: settings.vibrationEnabled ?? DEFAULT_NOTIFICATION_SETTINGS.vibrationEnabled,
    },
    privacy: {
      ...DEFAULT_PRIVACY_SETTINGS,
      profileVisibility: settings.profileVisibility || DEFAULT_PRIVACY_SETTINGS.profileVisibility,
      showOnlineStatus: settings.showOnlineStatus ?? DEFAULT_PRIVACY_SETTINGS.showOnlineStatus,
      showProgress: settings.showProgress ?? DEFAULT_PRIVACY_SETTINGS.showProgress,
      showLastSeen: settings.showLastSeen ?? DEFAULT_PRIVACY_SETTINGS.showLastSeen,
      showAchievements: settings.showAchievements ?? DEFAULT_PRIVACY_SETTINGS.showAchievements,
      allowMessages: settings.allowMessages || DEFAULT_PRIVACY_SETTINGS.allowMessages,
      allowFriendRequests: settings.allowFriendRequests ?? DEFAULT_PRIVACY_SETTINGS.allowFriendRequests,
      dataCollection: settings.dataCollection ?? DEFAULT_PRIVACY_SETTINGS.dataCollection,
      personalization: settings.personalization ?? DEFAULT_PRIVACY_SETTINGS.personalization,
      analytics: settings.analytics ?? DEFAULT_PRIVACY_SETTINGS.analytics,
    }
  };
}

function mapFrontendPatchToBackend(patch: SettingsPreferencesPatch): any {
  const flat: any = {};
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

  const payload = (await response.json()) as PreferencesResponse;
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

  const payload = (await response.json()) as PreferencesResponse;
  return mapBackendToFrontend(payload?.data?.settings);
}