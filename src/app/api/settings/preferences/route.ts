import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import {
  badRequestResponse,
  handleApiError,
  notFoundResponse,
  withAuth,
} from '@/lib/api-utils';
import type { SettingsPreferences, SettingsPreferencesPatch } from '../../../../types/user-ui-preferences';
import {
  getSettingsPreferences,
  upsertSettingsPreferences,
} from '@/lib/settings-preferences-store';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function buildPatch(body: unknown): SettingsPreferencesPatch | null {
  if (!isPlainObject(body)) return null;

  const patch: SettingsPreferencesPatch = {};

  if (isPlainObject(body.notifications)) {
    patch.notifications = body.notifications as unknown as SettingsPreferencesPatch['notifications'];
  }

  if (isPlainObject(body.privacy)) {
    patch.privacy = body.privacy as unknown as SettingsPreferencesPatch['privacy'];
  }

  if (isPlainObject(body.language)) {
    patch.language = body.language as unknown as SettingsPreferencesPatch['language'];
  }

  if (isPlainObject(body.appearance)) {
    patch.appearance = body.appearance as unknown as SettingsPreferencesPatch['appearance'];
  }



  return patch;
}

async function withNotificationChannelFlags(
  userId: string,
  preferences: SettingsPreferences
): Promise<SettingsPreferences> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailNotifications: true,
      smsNotifications: true,
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return {
    ...preferences,
    notifications: {
      ...preferences.notifications,
      emailEnabled: user.emailNotifications ?? preferences.notifications.emailEnabled,
      smsEnabled: user.smsNotifications ?? preferences.notifications.smsEnabled,
    },
  };
}

export async function GET(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    try {
      const preferences = await getSettingsPreferences(userId);
      const responsePayload = await withNotificationChannelFlags(userId, preferences);

      return NextResponse.json({ preferences: responsePayload }, { status: 200 });
    } catch (error) {
      if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
        return notFoundResponse('User not found');
      }

      return handleApiError(error);
    }
  });
}

export async function PATCH(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    try {
      let body: unknown;

      try {
        body = await req.json();
      } catch {
        return badRequestResponse('Invalid JSON');
      }

      const patch = buildPatch(body);
      if (!patch || Object.keys(patch).length === 0) {
        return badRequestResponse('No valid settings payload provided');
      }

      const notificationData = patch.notifications;
      const userUpdate: { emailNotifications?: boolean; smsNotifications?: boolean } = {};

      if (notificationData) {
        if (typeof notificationData.emailEnabled === 'boolean') {
          userUpdate.emailNotifications = notificationData.emailEnabled;
        }
        if (typeof notificationData.smsEnabled === 'boolean') {
          userUpdate.smsNotifications = notificationData.smsEnabled;
        }
      }

      if (Object.keys(userUpdate).length > 0) {
        await prisma.user.update({
          where: { id: userId },
          data: userUpdate,
          select: { id: true },
        });
      }

      const updated = await upsertSettingsPreferences(userId, patch);
      const responsePayload = await withNotificationChannelFlags(userId, updated);

      return NextResponse.json({ preferences: responsePayload }, { status: 200 });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
