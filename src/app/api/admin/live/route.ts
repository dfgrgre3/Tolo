import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAuth } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/live
 * Returns currently active users/sessions for live monitoring
 * This includes users currently taking exams, studying, or active in the last 5 minutes
 */
export async function GET(request: NextRequest) {
    return withAuth(request, async (authUser) => {
        try {
            const { searchParams } = new URL(request.url);
            const minutes = parseInt(searchParams.get('minutes') || '5', 10);
            const type = searchParams.get('type') || 'all'; // 'all', 'exam', 'study', 'online'

            const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

            // Get active sessions
            const activeSessions = await prisma.session.findMany({
                where: {
                    isActive: true,
                    lastAccessed: {
                        gte: cutoffTime
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            avatar: true
                        }
                    }
                },
                orderBy: {
                    lastAccessed: 'desc'
                }
            });

            // Get users with recent study sessions
            const recentStudySessions = await prisma.studySession.findMany({
                where: {
                    status: 'IN_PROGRESS',
                    startTime: {
                        gte: cutoffTime
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    subject: {
                        select: {
                            id: true,
                            name: true,
                            nameAr: true
                        }
                    }
                },
                orderBy: {
                    startTime: 'desc'
                }
            });

            // Get users currently taking exams (exam results in last 5 minutes without completion)
            const recentExamResults = await prisma.examResult.findMany({
                where: {
                    takenAt: {
                        gte: cutoffTime
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            avatar: true
                        }
                    },
                    exam: {
                        select: {
                            id: true,
                            title: true,
                            subject: {
                                select: {
                                    name: true,
                                    nameAr: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    takenAt: 'desc'
                }
            });

            // Combine and deduplicate active users
            const activeUsersMap = new Map();

            // Add users from active sessions
            for (const session of activeSessions) {
                if (!activeUsersMap.has(session.userId)) {
                    activeUsersMap.set(session.userId, {
                        userId: session.userId,
                        user: session.user,
                        sessionId: session.id,
                        lastAccessed: session.lastAccessed,
                        ip: session.ip,
                        deviceInfo: session.deviceInfo,
                        isActive: true,
                        currentActivity: 'online',
                        activityDetails: null
                    });
                }
            }

            // Add users from study sessions
            recentStudySessions.forEach(session => {
                const existing = activeUsersMap.get(session.userId);
                if (!existing || (session.startTime > existing.lastAccessed)) {
                    activeUsersMap.set(session.userId, {
                        userId: session.userId,
                        user: session.user,
                        sessionId: null,
                        lastAccessed: session.startTime,
                        ip: null,
                        deviceInfo: null,
                        isActive: true,
                        currentActivity: 'studying',
                        activityDetails: {
                            type: 'study',
                            subject: session.subject,
                            startTime: session.startTime,
                            duration: session.durationMin
                        }
                    });
                }
            });

            // Add users from exam results
            recentExamResults.forEach(result => {
                const existing = activeUsersMap.get(result.userId);
                // Only add if not already in a more recent activity
                if (!existing || (result.takenAt > existing.lastAccessed)) {
                    activeUsersMap.set(result.userId, {
                        userId: result.userId,
                        user: result.user,
                        sessionId: null,
                        lastAccessed: result.takenAt,
                        ip: null,
                        deviceInfo: null,
                        isActive: true,
                        currentActivity: 'taking_exam',
                        activityDetails: {
                            type: 'exam',
                            exam: result.exam,
                            takenAt: result.takenAt,
                            score: result.score
                        }
                    });
                }
            });

            // Convert to array and filter by type if needed
            let activeUsers = Array.from(activeUsersMap.values());

            if (type === 'exam') {
                activeUsers = activeUsers.filter(u => u.currentActivity === 'taking_exam');
            } else if (type === 'study') {
                activeUsers = activeUsers.filter(u => u.currentActivity === 'studying');
            } else if (type === 'online') {
                activeUsers = activeUsers.filter(u => u.currentActivity === 'online');
            }

            // Get summary statistics
            const stats = {
                totalActive: activeUsers.length,
                studying: activeUsers.filter(u => u.currentActivity === 'studying').length,
                takingExam: activeUsers.filter(u => u.currentActivity === 'taking_exam').length,
                online: activeUsers.filter(u => u.currentActivity === 'online').length,
                byRole: {
                    students: activeUsers.filter(u => u.user.role === 'STUDENT').length,
                    teachers: activeUsers.filter(u => u.user.role === 'TEACHER').length,
                    admins: activeUsers.filter(u => u.user.role === 'ADMIN').length,
                }
            };

            logger.info(`Live monitoring data fetched`, {
                adminId: authUser.userId,
                activeCount: stats.totalActive,
                type
            });

            return NextResponse.json({
                success: true,
                stats,
                activeUsers: activeUsers.map(u => ({
                    ...u,
                    lastAccessed: u.lastAccessed.toISOString(),
                    activityDetails: u.activityDetails ? {
                        ...u.activityDetails,
                        startTime: u.activityDetails.startTime?.toISOString(),
                        takenAt: u.activityDetails.takenAt?.toISOString()
                    } : null
                })),
                fetchedAt: new Date().toISOString(),
                periodMinutes: minutes
            });

        } catch (error) {
            logger.error('Failed to fetch live monitoring data:', error);
            return NextResponse.json(
                { success: false, error: 'Failed to fetch live data' },
                { status: 500 }
            );
        }
    });
}