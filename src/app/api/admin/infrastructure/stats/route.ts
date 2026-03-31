import { NextRequest, NextResponse } from "next/server";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError } from '@/lib/api-utils';
import { redisClient } from "@/lib/cache";
import { gamificationQueue, notificationQueue, analyticsQueue } from "@/lib/queue";
import { prisma } from "@/lib/db";

/**
 * --- ADMIN INFRASTRUCTURE API ---
 * 
 * Provides real-time health and performance metrics for the modular monolith.
 * Protected by ADMIN role check.
 */
export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      // Role Check
      if (authUser.role !== 'ADMIN') {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      try {
        // 1. BullMQ Stats (Aggregate across main queues)
        const [gamificationJobs, notificationJobs, analyticsJobs] = await Promise.all([
          gamificationQueue.getJobCounts('active', 'waiting', 'failed', 'completed'),
          notificationQueue.getJobCounts('active', 'waiting', 'failed', 'completed'),
          analyticsQueue.getJobCounts('active', 'waiting', 'failed', 'completed'),
        ]);

        // 2. Redis Stats
        const redisInfo = await redisClient.info();
        // Extract used_memory_human from info string
        const memoryMatch = redisInfo.match(/used_memory_human:(\d+\.?\d*\S+)/);
        const usedMemory = memoryMatch ? memoryMatch[1] : 'Unknown';

        // 3. Database Stats (Simulated or basic connection check)
        // Prisma doesn't expose pool stats directly easily without lower level client
        const dbStatus = await prisma.$queryRaw`SELECT 1`.then(() => 'Healthy').catch(() => 'Critical');

        return successResponse({
          system: {
            status: dbStatus === 'Healthy' ? 'Operational' : 'Degraded',
            uptime: process.uptime(),
            nodeVersion: process.version,
            memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
          },
          queues: {
             gamification: gamificationJobs,
             notifications: notificationJobs,
             analytics: analyticsJobs,
          },
          cache: {
             usedMemory,
             status: 'Online',
          }
        });
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}
