import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
          imageUrl: announcement.imageUrl,
          publishedAt: announcement.publishedAt.toISOString(),
          expiresAt: announcement.expiresAt?.toISOString(),
          priority: announcement.priority,
          category: announcement.category,
          authorName: announcement.author.name,
          tags: announcement.tags,
          views: announcement.views
        }));
      },
      600 // Cache for 10 minutes
    );

    return NextResponse.json(announcements);
  } catch (error) {
    logger.error("Error fetching announcements:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب الإعلانات" },
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
        userId, 
        title, 
        content, 
        imageUrl, 
        expiresAt, 
        priority, 
        category, 
        tags 
      } = await req.json();

    if (!userId || !title || !content || !priority || !category) {
      return NextResponse.json(
        { error: "جميع الحقول المطلوبة يجب ملؤها" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        imageUrl,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        priority,
        category,
        authorId: userId,
        tags: tags || []
      },
      include: {
        author: {
          select: { name: true }
        }
      }
    });

    // Transform the data to match the frontend structure
    const transformedAnnouncement = {
      id: newAnnouncement.id,
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      imageUrl: newAnnouncement.imageUrl,
      publishedAt: newAnnouncement.publishedAt.toISOString(),
      expiresAt: newAnnouncement.expiresAt?.toISOString(),
      priority: newAnnouncement.priority,
      category: newAnnouncement.category,
      authorName: newAnnouncement.author.name,
      tags: newAnnouncement.tags,
      views: newAnnouncement.views
    };

    // Invalidate all announcements cache when creating new announcement
    await CacheService.invalidatePattern('announcements*');

    return NextResponse.json(transformedAnnouncement, { status: 201 });
  } catch (error) {
    logger.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "حدث خطأ في إنشاء الإعلان" },
      { status: 500 }
    );
    }
  });
}
