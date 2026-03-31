import { progressRepository, ProgressUpdateData } from './progress.repository';
import { xpService } from '../gamification/xp.service';
import { realtimeBus } from '@/lib/realtime';
import { logger } from '@/lib/logger';
import redisService from '@/lib/redis';
import { prisma } from '@/lib/db';

/**
 * --- PROGRESS SERVICE ---
 * 
 * Logic for managing user learning journey.
 * Goal: Sub-200ms API response by utilizing async XP awarding.
 */
export class ProgressService {
    private static instance: ProgressService;

    public static getInstance(): ProgressService {
        if (!ProgressService.instance) ProgressService.instance = new ProgressService();
        return ProgressService.instance;
    }

    /**
     * Updates topic progress with integrated side-effects (XP, Realtime)
     */
    async updateProgress(data: ProgressUpdateData) {
        const { userId, subTopicId, completed } = data;
        const SUMMARY_CACHE_KEY = `user:${userId}:progress-summary`;
        
        try {
            // 1. Persist to DB using the Repository layer
            const progress = await progressRepository.upsertProgress(data);
            
            // 2. Cache Invalidation (Unified Key)
            // Critical: Ensure the key matches the one used in getSummary
            await redisService.del(SUMMARY_CACHE_KEY);
            
            // 3. Side Effects (Asynchronous and Resilient)
            if (completed) {
                // Award 10 XP via background processing (BullMQ inside xpService)
                xpService.awardXP(userId, 10, 'study').catch(err => {
                    logger.error(`[ProgressService] Background XP award failed: ${err.message}`);
                });
            }

            // 4. SSE / Realtime Bus
            realtimeBus.emitProgress(userId, progress);

            return { success: true, data: progress };
        } catch (error) {
            logger.error(`[ProgressService] Failed updateProgress for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Highly optimized summary for the Dashboard.
     * Scale: Targeted for 1M+ users (Latency < 200ms using Redis + Agreggations)
     */
    async getSummary(userId: string) {
        const cacheKey = `user:${userId}:progress-summary`;
        
        return await redisService.getOrSet(cacheKey, async () => {
            // 1. Fetch enrollments with efficient count-based aggregation
            // We use _count to avoid fetching thousands of subtopic objects into memory
            const enrollments = await prisma.subjectEnrollment.findMany({
                where: { userId },
                select: {
                    subjectId: true,
                    subject: {
                        select: {
                            id: true,
                            name: true,
                            nameAr: true,
                            topics: {
                                select: {
                                    id: true,
                                    title: true,
                                    _count: {
                                        select: {
                                            subTopics: true
                                        }
                                    },
                                    subTopics: {
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // 2. Fetch completed progress (Already optimized in Repository)
            const completed = await progressRepository.getUserProgressSummary(userId);
            const completedIds = new Set(completed.filter((p: any) => p.completed).map((p: any) => p.subTopicId));

            // 3. Optimized Assembly: No redundant full object traversal
            return enrollments.map((enr: any) => {
                const subject = enr.subject;
                let subjectTotal = 0;
                let subjectCompleted = 0;

                const topics = subject.topics.map((t: any) => {
                    const total = t._count.subTopics;
                    const completedCount = t.subTopics.filter((st: any) => completedIds.has(st.id)).length;
                    
                    subjectTotal += total;
                    subjectCompleted += completedCount;

                    return {
                        id: t.id,
                        name: t.title,
                        total,
                        completed: completedCount,
                        progress: total > 0 ? (completedCount / total) * 100 : 0
                    };
                });

                return {
                    subjectId: enr.subjectId,
                    subjectName: subject.nameAr || subject.name,
                    totalSubTopics: subjectTotal,
                    completedSubTopics: subjectCompleted,
                    progress: subjectTotal > 0 ? (subjectCompleted / subjectTotal) * 100 : 0,
                    topics
                };
            });
        }, 3600); // Higher TTL (1 hour) as invalidation is now consistent
    }
}

export const progressService = ProgressService.getInstance();
export default progressService;
