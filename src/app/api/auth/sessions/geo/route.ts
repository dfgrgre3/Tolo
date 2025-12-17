/**
 * 🌍 Geo Sessions API
 * 
 * إرجاع جلسات المستخدم مع معلومات الموقع الجغرافي
 */

import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/services/auth-service';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getGeoLocationService } from '@/lib/security/geo/geo-location-service';

export async function GET(request: NextRequest) {
    try {
        // Get token from Authorization header
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json(
                { error: 'غير مصرح لك بالوصول' },
                { status: 401 }
            );
        }

        // Find session by refresh token
        const currentSession = await prisma.session.findFirst({
            where: {
                refreshToken: token,
                isActive: true,
                expiresAt: { gt: new Date() },
            },
            select: { id: true, userId: true },
        });

        if (!currentSession) {
            return NextResponse.json(
                { error: 'جلسة غير صالحة' },
                { status: 401 }
            );
        }

        const userId = currentSession.userId;
        const currentSessionId = currentSession.id;
        const geoService = getGeoLocationService();

        // Get user sessions
        const sessions = await prisma.session.findMany({
            where: {
                userId,
                expiresAt: { gt: new Date() },
            },
            orderBy: { lastAccessed: 'desc' },
            take: 20,
        });

        // Get security logs for location data
        const securityLogs = await prisma.securityLog.findMany({
            where: {
                userId,
                eventType: 'LOGIN_SUCCESS',
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        // Build geo sessions
        const geoSessions = await Promise.all(
            sessions.map(async (sess) => {
                // Find matching security log for location
                const log = securityLogs.find(l =>
                    Math.abs(new Date(l.createdAt).getTime() - new Date(sess.createdAt).getTime()) < 60000
                );

                let location;
                const ip = log?.ip || sess.ip || '127.0.0.1';

                if (log?.location) {
                    // Parse stored location
                    try {
                        location = JSON.parse(log.location);
                    } catch {
                        location = await geoService.getLocationFromIP(ip);
                    }
                } else {
                    location = await geoService.getLocationFromIP(ip);
                }

                // Parse device info
                let device = 'Unknown';
                let browser = 'Unknown';

                if (sess.deviceInfo) {
                    device = sess.deviceInfo;
                }

                const isCurrentSession = sess.id === currentSessionId;

                return {
                    sessionId: sess.id,
                    userId,
                    location: location || {
                        ip,
                        country: 'Unknown',
                        countryCode: 'XX',
                        region: '',
                        regionCode: '',
                        city: 'Unknown',
                        lat: 0,
                        lng: 0,
                        timezone: 'UTC',
                    },
                    timestamp: sess.createdAt,
                    device,
                    browser,
                    isCurrentSession,
                    isSuspicious: false,
                };
            })
        );

        // Get unique countries
        const uniqueCountries = [...new Set(geoSessions.map(s => s.location.country))];
        const uniqueCities = [...new Set(geoSessions.map(s => s.location.city))];

        return NextResponse.json({
            sessions: geoSessions,
            stats: {
                totalSessions: geoSessions.length,
                uniqueCountries,
                uniqueCities,
                suspiciousCount: geoSessions.filter(s => s.isSuspicious).length,
            },
        });

    } catch (error) {
        logger.error('Error fetching geo sessions:', error);

        return NextResponse.json(
            { error: 'حدث خطأ أثناء تحميل البيانات' },
            { status: 500 }
        );
    }
}
