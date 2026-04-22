'use client';

import type { SettingsPreferences, SettingsPreferencesPatch } from '@/types/user-ui-preferences';

type PreferencesResponse = {
  preferences: SettingsPreferences;
};

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload?.error === 'string') {
      return payload.error;
    }
  } catch {
    // Ignore JSON parsing failures and return a generic message below.
  }

  return 'Failed to process settings request';
}

export async function fetchSettingsPreferences(): Promise<SettingsPreferences> {
  const response = await fetch('/api/settings/preferences', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const data = (await response.json()) as PreferencesResponse;
  return data.preferences;
}

export async function saveSettingsPreferences(
  patch: SettingsPreferencesPatch
): Promise<SettingsPreferences> {
  const response = await fetch('/api/settings/preferences', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const data = (await response.json()) as PreferencesResponse;
  return data.preferences;
}
