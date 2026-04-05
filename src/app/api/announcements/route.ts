import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { Announcement } from '@prisma/client';
import { CacheService } from "@/lib/cache-service-unified";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { handleApiError, successResponse, badRequestResponse } from '@/lib/api-utils';

interface AnnouncementResponse {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  priority: string;
  isActive: boolean;
}

// GET all announcements with caching
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const limit = parseInt(searchParams.get('limit') || '10');
      const categoryRaw = searchParams.get('category');
      const category = categoryRaw ? parseInt(categoryRaw, 10) : null;

      // Create cache key based on parameters
      const cacheKey = `announcements_${category !== null ? `category_${category}_` : ''}limit_${limit}`;

      // Use distributed cache with fallback to database query
      const announcements = await CacheService.getOrSet(
        cacheKey,
        async () => {
          const items = await prisma.announcement.findMany({
            take: limit,
            where: {
              isActive: true,
              ...(category !== null && { priority: category })
            },
            orderBy: {
              createdAt: "desc"
            }
          });

          // Transform the data to match the frontend structure
          return items.map((item: Announcement): AnnouncementResponse => ({
            id: item.id,
            title: item.title,
            content: item.content,
            createdAt: item.createdAt.toISOString(),
            priority: item.priority.toString(),
            isActive: item.isActive
          }));
        },
        600 // Cache for 10 minutes
      );

      return successResponse(announcements);
    } catch (error: unknown) {
      logger.error("Error fetching announcements:", error);
      return handleApiError(error);
    }
  });
}

// POST create a new announcement
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json() as { title?: string; content?: string; priority?: number };
      const {
        title,
        content,
        priority
      } = body;

      if (!title || !content || priority === undefined) {
        return badRequestResponse("جميع الحقول المطلوبة يجب ملؤها");
      }

      const newAnnouncement = await prisma.announcement.create({
        data: {
          title,
          content,
          priority
        }
      });

      // Transform the data to match the frontend structure
      const transformedAnnouncement: AnnouncementResponse = {
        id: newAnnouncement.id,
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        createdAt: newAnnouncement.createdAt.toISOString(),
        priority: newAnnouncement.priority.toString(),
        isActive: newAnnouncement.isActive
      };

      // Invalidate all announcements cache when creating new announcement
      await CacheService.invalidatePattern('announcements*');

      return successResponse(transformedAnnouncement, undefined, 201);
    } catch (error: unknown) {
      logger.error("Error creating announcement:", error);
      return handleApiError(error);
    }
  });
}
