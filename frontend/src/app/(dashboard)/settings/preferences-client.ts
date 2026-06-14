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

type PreferencesResponse = {
  success?: boolean;
  data?: {
    settings: any;
  };
};

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const text = await response.text();
    console.log("DEBUG [parseErrorMessage]: status=", response.status, "body=", text);
    
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
    console.error("DEBUG [parseErrorMessage]: Failed to read response body:", err);
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
      ...settings, // spread all since they match the flat struct names mostly
    },
    privacy: {
      ...DEFAULT_PRIVACY_SETTINGS,
      profileVisibility: settings.profileVisibility || DEFAULT_PRIVACY_SETTINGS.profileVisibility,
      showOnlineStatus: settings.showOnlineStatus ?? DEFAULT_PRIVACY_SETTINGS.showOnlineStatus,
      showProgress: settings.showProgress ?? DEFAULT_PRIVACY_SETTINGS.showProgress,
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
  const response = await fetchFn('/api/settings/preferences', {
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
  console.log("DEBUG [saveSettingsPreferences]: Sending patch:", JSON.stringify(flatPatch));
  
  const response = await fetchFn('/api/settings/preferences', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(flatPatch),
  } as RequestInit);

  if (!response.ok) {
    const errorMsg = await parseErrorMessage(response);
    console.error("DEBUG [saveSettingsPreferences]: Request failed with status", response.status, "error:", errorMsg);
    throw new Error(errorMsg);
  }

  const payload = (await response.json()) as PreferencesResponse;
  return mapBackendToFrontend(payload?.data?.settings);
}