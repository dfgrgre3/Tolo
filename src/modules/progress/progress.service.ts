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
        
        try {
            // 1. Persist to DB using the Repository layer
            const progress = await progressRepository.upsertProgress(data);
            
            // 2. Cache Invalidation
            // We invalidate the user's progress cache to ensure fresh data on next fetch
            await redisService.del(`user:${userId}:progress-summary`);
            
            // 3. Side Effects (Background processing where possible)
            // AWard XP: Async, don't wait for it to finish to return the response
            if (completed) {
                // Award 10 XP for completion of a lesson Topic
                xpService.awardXP(userId, 10, 'study').catch(err => {
                    logger.error(`[ProgressService] Failed to award XP for user ${userId}:`, err);
                });
            }

            // 4. Send Realtime Update (SSE)
            // This pushes the "Success" to the user's UI instantly
            realtimeBus.emitProgress(userId, progress);

            return { success: true, data: progress };
        } catch (error) {
            logger.error(`[ProgressService] Critical failure in updateProgress for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Highly optimized summary for the Dashboard.
     * Goal: API Latency < 200ms by utilizing distributed caching.
     */
    async getSummary(userId: string) {
        const cacheKey = `user:${userId}:summary-education`;
        
        return await redisService.getOrSet(cacheKey, async () => {
            // 1. Fetch enrollments with efficient nested select
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
                                    subTopics: {
                                        select: { id: true }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            // 2. Fetch ALL completed subtopics in one query
            const completed = await progressRepository.getUserProgressSummary(userId);
            const completedIds = new Set(completed.filter((p: any) => p.completed).map((p: any) => p.subTopicId));

            // 3. Assemble response using the "Select only what is needed" principle
            return enrollments.map((enr: any) => {
                const subject = enr.subject;
                let subjectTotal = 0;
                let subjectCompleted = 0;

                const topics = subject.topics.map((t: any) => {
                    const total = t.subTopics.length;
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
        }, 1800); // 30 minutes TTL
    }
}

export const progressService = ProgressService.getInstance();
export default progressService;
