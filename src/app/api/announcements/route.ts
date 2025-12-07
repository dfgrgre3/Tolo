import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { CacheService } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

// GET all announcements with caching
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');

    // Create cache key based on parameters
    const cacheKey = `announcements_${category ? `category_${category}_` : ''}limit_${limit}`;

    // Use distributed cache with fallback to database query
    const announcements = await CacheService.getOrSet(
      cacheKey,
      async () => {
        const announcements = await prisma.announcement.findMany({
          take: limit,
          where: {
            isActive: true,
            ...(category && { priority: category })
          },
          orderBy: {
            createdAt: "desc"
          }
        });

        // Transform the data to match the frontend structure
        return announcements.map((announcement: any) => ({
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          createdAt: announcement.createdAt.toISOString(),
          priority: announcement.priority,
          isActive: announcement.isActive
        }));
      },
      600 // Cache for 10 minutes
    );

    return NextResponse.json(announcements);
  } catch (error) {
    logger.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ط¥ط¹ظ„ط§ظ†ط§طھ" },
      { status: 500 }
    );
    }
  });
}

// POST create a new announcement
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { 
        title, 
        content, 
        priority
      } = await req.json();

    if (!title || !content || !priority) {
      return NextResponse.json(
        { error: "ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ„ ط§ظ„ظ…ط·ظ„ظˆط¨ط© ظٹط¬ط¨ ظ…ظ„ط¤ظ‡ط§" },
        { status: 400 }
      );
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority
      }
    });

    // Transform the data to match the frontend structure
    const transformedAnnouncement = {
      id: newAnnouncement.id,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      createdAt: newAnnouncement.createdAt.toISOString(),
      priority: newAnnouncement.priority,
      isActive: newAnnouncement.isActive
    };

    // Invalidate all announcements cache when creating new announcement
    await CacheService.invalidatePattern('announcements*');

    return NextResponse.json(transformedAnnouncement, { status: 201 });
  } catch (error) {
    logger.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ط¥ط¹ظ„ط§ظ†" },
      { status: 500 }
    );
    }
  });
}
