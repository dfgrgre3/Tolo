/**
 * 🔐 Step-Up Authentication - Send Code API
 * 
 * إرسال رمز التحقق الإضافي
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStepUpAuthManager } from '@/lib/security/adaptive';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
    try {
        const { sessionId, method, email, phone, userId } = await request.json();

        if (!sessionId) {
            return NextResponse.json(
                { error: 'معرف الجلسة مطلوب' },
                { status: 400 }
            );
        }

        if (!method) {
            return NextResponse.json(
                { error: 'طريقة التحقق مطلوبة' },
                { status: 400 }
            );
        }

        // Validate method requirements
        if (method === 'email_otp' && !email) {
            return NextResponse.json(
                { error: 'البريد الإلكتروني مطلوب' },
                { status: 400 }
            );
        }

        if ((method === 'sms_otp' || method === 'whatsapp_otp') && !phone) {
            return NextResponse.json(
                { error: 'رقم الهاتف مطلوب' },
                { status: 400 }
            );
        }

        const manager = getStepUpAuthManager();

        // Create a minimal risk assessment for the step-up request
        const riskAssessment = {
            score: 50,
            level: 'medium' as const,
            signals: {} as any,
            reasons: [],
            action: 'step_up' as const,
            sessionId,
            timestamp: new Date(),
        };

        const result = await manager.initiateStepUp(
            userId || 'anonymous',
            method,
            riskAssessment,
            { email, phone }
        );

        if (!result.success) {
            return NextResponse.json(
                { error: result.message, status: result.status },
                { status: 400 }
            );
        }

        logger.info('Step-up code sent', {
            sessionId,
            method,
            email: email ? email.substring(0, 3) + '***' : undefined,
        });

        return NextResponse.json({
            success: true,
            status: result.status,
            message: result.message,
        });

    } catch (error) {
        logger.error('Step-up send error:', error);

        return NextResponse.json(
            { error: 'حدث خطأ أثناء إرسال رمز التحقق' },
            { status: 500 }
        );
    }
}
