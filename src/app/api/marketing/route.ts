import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";

import { handleApiError, successResponse, withAuth } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async () => {
    try {
      const stats = await prisma.marketingCampaign.aggregate({
        _sum: {
          deliveredCount: true,
          openedCount: true,
          claimedCount: true
        }
      });

      const campaigns = await prisma.marketingCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      });

      const totalSent = stats._sum.deliveredCount || 0;
      const totalOpen = stats._sum.openedCount || 0;

      const ctr = totalSent > 0 ? (totalOpen / totalSent * 100).toFixed(1) + "%" : "0%";

      return successResponse({
        stats: {
          delivered: totalSent,
          opened: ctr,
          lootsClaimed: stats._sum.claimedCount || 0
        },
        recentCampaigns: campaigns
      });
    } catch (error: any) {
      return handleApiError(error);
    }
  });
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async ({ userId }) => {
      try {
        const data = await req.json();

        const campaign = await prisma.marketingCampaign.create({
          data: {
            title: data.title,
            content: data.content,
            audience: data.audience,
            rewardType: data.rewardType,
            rewardValue: parseFloat(data.rewardValue) || 0,
            status: "SENT", // Simulating immediate send for now
            deliveredCount: 450 // Mock count of recipients
          }
        });

        // In a real system, we'd trigger a background job to send notifications here

        return successResponse(campaign);
      } catch (error: any) {
        return handleApiError(error);
      }
    });
  });
}