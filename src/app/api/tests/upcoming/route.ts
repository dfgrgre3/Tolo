
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

    // Get upcoming tests (within 24 hours)
    const tests = await prisma.exam.findMany({
      where: {
        date: {
          lte: tomorrow,
          gte: now,
        },
      },
      include: {
        results: {
          where: {
            userId: decodedToken.userId,
          },
        },
      },
    });

    // Filter tests that the user hasn't taken yet
    const upcomingTests = tests.filter(test => 
      test.results.length === 0 || 
      !test.results.some(result => 
        new Date(result.takenAt) >= now && new Date(result.takenAt) <= tomorrow
      )
    );

    return NextResponse.json({ tests: upcomingTests });
  } catch (error) {
    console.error('Error fetching upcoming tests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upcoming tests' },
      { status: 500 }
    );
  }
}
