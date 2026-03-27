import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import type {
  SettingsPreferences,
  SettingsPreferencesPatch,
  NotificationSettingsPreference,
  PrivacySettingsPreference,
} from '@/types/settings-preferences';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
} from '@/types/settings-preferences';

type RawPreferencesRow = {
  privacy: string | null;
  notifications: string | null;
};

let tableReady = false;

function createDefaultPreferences(): SettingsPreferences {
  return {
    privacy: { ...DEFAULT_PRIVACY_SETTINGS },
    notifications: { ...DEFAULT_NOTIFICATION_SETTINGS },
  };
}

async function ensurePreferencesTable(): Promise<void> {
  if (tableReady) return;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "user_preferences" (
        "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
        "privacy" TEXT NOT NULL DEFAULT '{}',
        "notifications" TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    tableReady = true;
  } catch (error) {
    logger.error('[ENSURE_PREFERENCES_TABLE_FAILED]', error);
    // Don't throw here to allow subsequent queries to fail with more descriptive errors
    // if the table actually doesn't exist.
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSection(raw: string | null): Record<string, unknown> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function mergePreferences(
  current: SettingsPreferences,
  patch: SettingsPreferencesPatch
): SettingsPreferences {
  return {
    privacy: {
      ...current.privacy,
      ...(patch.privacy ?? {}),
    },
    notifications: {
      ...current.notifications,
      ...(patch.notifications ?? {}),
    },
  };
}

export async function getSettingsPreferences(userId: string): Promise<SettingsPreferences> {
  await ensurePreferencesTable();

  const defaults = createDefaultPreferences();

  const rows = await prisma.$queryRaw<RawPreferencesRow[]>`
    SELECT "privacy", "notifications"
    FROM "user_preferences"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  if (rows.length === 0) {
    return defaults;
  }

  const row = rows[0];
  return mergePreferences(defaults, {
    privacy: parseSection(row.privacy) as Partial<PrivacySettingsPreference>,
    notifications: parseSection(row.notifications) as Partial<NotificationSettingsPreference>,
  });
}

export async function upsertSettingsPreferences(
  userId: string,
  patch: SettingsPreferencesPatch
): Promise<SettingsPreferences> {
  try {
    await ensurePreferencesTable();

    const current = await getSettingsPreferences(userId);
    const merged = mergePreferences(current, patch);

    await prisma.$executeRaw`
      INSERT INTO "user_preferences" (
        "userId",
        "privacy",
        "notifications",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${userId},
        ${JSON.stringify(merged.privacy)},
        ${JSON.stringify(merged.notifications)},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId")
      DO UPDATE SET
        "privacy" = EXCLUDED."privacy",
        "notifications" = EXCLUDED."notifications",
        "updatedAt" = CURRENT_TIMESTAMP
    `;

    return merged;
  } catch (error) {
    logger.error('[SETTINGS_PREFERENCES_UPSERT_FAILED]', { userId, error });
    throw error;
  }
}
