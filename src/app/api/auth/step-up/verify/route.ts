/**
 * 🔐 Step-Up Authentication - Verify Code API
 * 
 * التحقق من رمز المصادقة الإضافي
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStepUpAuthManager } from '@/lib/security/adaptive';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { sessionId, code, method } = await request.json();

        if (!sessionId) {
            return NextResponse.json(
                { error: 'معرف الجلسة مطلوب' },
                { status: 400 }
            );
        }

        if (!code) {
            return NextResponse.json(
                { error: 'رمز التحقق مطلوب' },
                { status: 400 }
            );
        }

        if (!method) {
            return NextResponse.json(
                { error: 'طريقة التحقق مطلوبة' },
                { status: 400 }
            );
        }

        // Validate code format
        const cleanCode = code.toString().replace(/\D/g, '');
        if (cleanCode.length !== 6) {
            return NextResponse.json(
                { error: 'رمز التحقق يجب أن يكون 6 أرقام' },
                { status: 400 }
            );
        }

        const manager = getStepUpAuthManager();
        const result = await manager.verifyStepUp(sessionId, cleanCode, method);

        if (!result.success) {
            logger.warn('Step-up verification failed', {
                sessionId,
                method,
                status: result.status,
                remainingAttempts: result.remainingAttempts,
            });

            return NextResponse.json(
                {
                    error: result.message,
                    status: result.status,
                    remainingAttempts: result.remainingAttempts,
                },
                { status: 400 }
            );
        }

        logger.info('Step-up verification successful', {
            sessionId,
            method,
        });

        return NextResponse.json({
            success: true,
            status: result.status,
            message: result.message,
        });

    } catch (error) {
        logger.error('Step-up verify error:', error);

        return NextResponse.json(
            { error: 'حدث خطأ أثناء التحقق' },
            { status: 500 }
        );
    }
}
