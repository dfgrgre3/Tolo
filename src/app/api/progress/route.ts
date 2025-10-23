import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { withAuthCache } from '@/lib/cache-middleware';
import { invalidateUserCache } from '@/lib/cache-invalidation-service';

export async function GET(request: NextRequest) {
  return withAuthCache(request, handleGetRequest, 'progress', 300); // Cache for 5 minutes
}

async function handleGetRequest(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's study streak
    const studySessions = await prisma.studySession.findMany({
      where: {
        userId: decodedToken.userId,
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    // Calculate streak days
    let streakDays = 0;
    if (studySessions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Check if user studied today or yesterday
      const studiedToday = studySessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === today.getTime();
      });

      const studiedYesterday = studySessions.some(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate.getTime() === yesterday.getTime();
      });

      if (studiedToday || studiedYesterday) {
        streakDays = 1;

        // Calculate consecutive days
        let checkDate = studiedToday ? yesterday : new Date(yesterday);
        checkDate.setDate(checkDate.getDate() - 1);

        while (true) {
          const studiedOnDate = studySessions.some(session => {
            const sessionDate = new Date(session.startTime);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate.getTime() === checkDate.getTime();
          });

          if (studiedOnDate) {
            streakDays++;
            checkDate.setDate(checkDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }

    // Get recent goals (this is a placeholder, adjust based on your actual goals model)
    const recentGoals = await prisma.recommendation.findMany({
      where: {
        userId: decodedToken.userId,
        title: {
          contains: 'هدف',
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    // Mark goals as achieved (this is a placeholder logic)
    const goalsWithStatus = recentGoals.map(goal => ({
      ...goal,
      achieved: Math.random() > 0.7, // Random for demo
      notified: false, // This would be stored in the database in a real app
    }));

    const result = { 
      streakDays,
      recentGoals: goalsWithStatus 
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}