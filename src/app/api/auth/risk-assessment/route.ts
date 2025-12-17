/**
 * 🛡️ Risk Assessment API
 * 
 * تقييم مخاطر محاولة تسجيل الدخول
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdaptiveAuthEngine } from '@/lib/security/adaptive';
import { logger } from '@/lib/logger';
import type { LoginContext, LoginHistory } from '@/lib/security/adaptive/types';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const headersList = await headers();

        // Build login context
        const context: LoginContext = {
            userId: body.userId,
            email: body.email,
            ip: headersList.get('x-forwarded-for')?.split(',')[0] ||
                headersList.get('x-real-ip') ||
                '127.0.0.1',
            userAgent: headersList.get('user-agent') || '',
            fingerprint: body.fingerprint,
            geo: body.geo, // Optional: client can send geo if available
            device: body.device,
            timestamp: new Date(),
            sessionId: body.sessionId || `risk_${Date.now()}`,
        };

        // Get login history for user (if available)
        let loginHistory: LoginHistory[] = [];

        if (context.userId || context.email) {
            try {
                // Fetch security logs from database
                const logs = await prisma.securityLog.findMany({
                    where: {
                        OR: [
                            { userId: context.userId },
                            { metadata: { contains: context.email || '' } },
                        ],
                        eventType: { in: ['LOGIN_SUCCESS', 'LOGIN_ATTEMPT'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 20,
                });

                loginHistory = logs.map((log) => ({
                    userId: log.userId || '',
                    ip: log.ip || '',
                    geo: log.location ? {
                        city: log.location,
                        country: log.location.split(',').pop()?.trim(),
                    } : undefined,
                    device: log.deviceInfo ? {
                        type: 'unknown' as const,
                        browser: log.deviceInfo,
                    } : undefined,
                    timestamp: log.createdAt,
                    success: log.eventType === 'LOGIN_SUCCESS',
                    riskScore: undefined,
                }));
            } catch (error) {
                logger.warn('Failed to fetch login history:', error);
            }
        }

        // Evaluate risk
        const engine = getAdaptiveAuthEngine();
        const result = await engine.evaluateLogin(context, loginHistory);

        // Log the assessment
        logger.info('Risk assessment completed', {
            sessionId: result.riskAssessment.sessionId,
            score: result.riskAssessment.score,
            level: result.riskAssessment.level,
            action: result.action,
            ip: context.ip,
        });

        return NextResponse.json({
            ...result.riskAssessment,
            allowed: result.allowed,
            stepUpRequired: result.stepUpRequired,
            stepUpMethods: result.stepUpMethods,
            message: result.message,
            messageAr: result.messageAr,
        });

    } catch (error) {
        logger.error('Risk assessment error:', error);

        // Return low risk on error (fail open for UX, but log)
        return NextResponse.json({
            score: 0,
            level: 'low',
            action: 'allow',
            allowed: true,
            stepUpRequired: false,
            sessionId: `error_${Date.now()}`,
            timestamp: new Date(),
            signals: {},
            reasons: [],
        });
    }
}
