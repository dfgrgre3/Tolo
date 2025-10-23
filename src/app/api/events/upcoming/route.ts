
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current date and tomorrow's date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get upcoming events (within 24 hours)
    const events = await prisma.event.findMany({
      where: {
        startDate: {
          lte: tomorrow,
          gte: now,
        },
        OR: [
          {
            isPublic: true,
          },
          {
            attendees: {
              some: {
                userId: decodedToken.userId,
              },
            },
          },
        ],
      },
      include: {
        attendees: {
          where: {
            userId: decodedToken.userId,
          },
        },
      },
    });

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming events' },
      { status: 500 }
    );
  }
}
