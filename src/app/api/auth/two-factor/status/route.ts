import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { addSecurityHeaders, createStandardErrorResponse } from '@/lib/auth-utils';
import { logger } from '@/lib/logger';
import { opsWrapper } from '@/lib/middleware/ops-middleware';

export async function GET(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        try {
            const authResult = await authService.getCurrentUser();
            if (!authResult.isValid || !authResult.user) {
                return NextResponse.json(
                    { error: 'Unauthorized', code: 'UNAUTHORIZED' },
                    { status: 401 }
                );
            }

            const user = await authService.findUserByEmail(authResult.user.email);

            const response = NextResponse.json({
                enabled: user?.twoFactorEnabled || false
            });

            return addSecurityHeaders(response);
        } catch (error) {
            logger.error('2FA status error:', error);
            return createStandardErrorResponse(error, 'Failed to get 2FA status');
        }
    });
}
