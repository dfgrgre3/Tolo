import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { badRequestResponse, handleApiError, withAuth } from '@/lib/api-utils';
import { getSettingsPreferences } from '@/lib/settings-preferences-store';
import { SessionService } from '@/services/auth/session-service';

type PrivacyAction = 'export-data' | 'clear-history';

function isValidAction(action: unknown): action is PrivacyAction {
  return action === 'export-data' || action === 'clear-history';
}

export async function POST(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    try {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return badRequestResponse('Invalid JSON');
      }

      const action = (body as { action?: unknown })?.action;
      if (!isValidAction(action)) {
        return badRequestResponse('Invalid action');
      }

      if (action === 'clear-history') {
        const result = await prisma.securityLog.deleteMany({
          where: { userId },
        });

        return NextResponse.json(
          { message: 'History cleared', deletedCount: result.count },
          { status: 200 }
        );
      }

      const [user, sessions, preferences] = await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            username: true,
            phone: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        SessionService.getActiveSessions(userId),
        getSettingsPreferences(userId),
      ]);

      return NextResponse.json(
        {
          exportData: {
            user,
            activeSessions: sessions,
            preferences,
            exportedAt: new Date().toISOString(),
          },
        },
        { status: 200 }
      );
    } catch (error) {
      return handleApiError(error);
    }
  });
}
