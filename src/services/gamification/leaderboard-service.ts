import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { LeaderboardEntry } from './types';

export class LeaderboardService {
  private static instance: LeaderboardService;

  private constructor() {}

  public static getInstance(): LeaderboardService {
    if (!LeaderboardService.instance) {
      LeaderboardService.instance = new LeaderboardService();
    }
    return LeaderboardService.instance;
  }

  async getLeaderboard(
    type: 'global' | 'daily' | 'weekly' | 'monthly' | 'season' | 'subject' = 'global',
    limit: number = 50,
    options: { subjectId?: string; seasonId?: string; period?: string } = {}
  ): Promise<LeaderboardEntry[]> {
    if (type === 'global') {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          totalXP: true,
          level: true,
          avatar: true
        },
        orderBy: { totalXP: 'desc' },
        take: limit
      });

      return users.map((u: any, i: number) => ({
        userId: u.id,
        username: u.username || 'طالب مجهول',
        totalXP: u.totalXP || 0,
        level: u.level || 1,
        rank: i + 1,
        avatar: u.avatar || undefined
      }));
    }

    const where: Prisma.LeaderboardEntryWhereInput = { type: type as any };
    if (options.subjectId) where.subjectId = options.subjectId;
    if (options.seasonId) where.seasonId = options.seasonId;
    if (options.period) where.period = options.period;

    const entries = await prisma.leaderboardEntry.findMany({
      where,
      include: { user: { select: { username: true, avatar: true } } },
      orderBy: { totalXP: 'desc' },
      take: limit
    });

    return entries.map((e: any, i: number) => ({
      userId: e.userId,
      username: e.user?.username || 'طالب مجهول',
      totalXP: e.totalXP,
      level: e.level,
      rank: i + 1,
      avatar: e.user?.avatar || undefined,
      studyXP: e.studyXP,
      taskXP: e.taskXP,
      examXP: e.examXP,
      challengeXP: e.challengeXP,
      questXP: e.questXP,
    }));
  }
}

export const leaderboardService = LeaderboardService.getInstance();
