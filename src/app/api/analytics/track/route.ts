import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(req: Request) {
  try {
    const userId = req.headers.get('X-User-ID') || null;
    const body = await req.json();
    const { type, metadata } = body;

    if (!type) {
        return NextResponse.json({ error: 'Missing type' }, { status: 400 });
    }

    await prisma.analyticsEvent.create({
      data: {
        userId,
        type,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Analytics Track Error:', error);
    return NextResponse.json({ success: false }); // Silently fail for analytics
  }
}
