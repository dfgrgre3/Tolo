import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-service";
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
      return badRequestResponse('Unauthorized', 'UNAUTHORIZED');
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    // For security, we should only allow fetching the authenticated user's schedule
    // unless there's a specific admin requirement
    if (!userId || userId !== decodedToken.userId) {
      return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
    }
    
    let schedule = await prisma.schedule.findFirst({ 
      where: { 
        userId, 
        active: true 
      } 
    });
    
    if (!schedule) {
      schedule = await prisma.schedule.create({ 
        data: { 
          userId, 
          name: "مخصص", 
          weeklyHours: 0, 
          planJson: JSON.stringify({}), 
          active: true 
        } 
      });
    }
    
    return successResponse(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const decodedToken = await verifyToken(req);
    if (!decodedToken) {
      return badRequestResponse('Unauthorized', 'UNAUTHORIZED');
    }

    let body;
    try {
      body = await req.json();
    } catch (error) {
      return badRequestResponse('Invalid JSON body', 'INVALID_JSON');
    }
    
    const { userId, plan } = body as { userId: string; plan: any };
    
    // For security, we should only allow modifying the authenticated user's schedule
    if (!userId || userId !== decodedToken.userId) {
      return badRequestResponse('Invalid userId parameter', 'INVALID_PARAMETER');
    }
    
    // Validate that plan is present
    if (!plan) {
      return badRequestResponse('Plan is required', 'MISSING_PLAN');
    }
    
    const existing = await prisma.schedule.findFirst({
      where: { 
        userId_active: { 
          userId, 
          active: true 
        } 
      }
    });

    if (existing && existing.version > (body.version || 0)) {
      return NextResponse.json(
        { error: 'CONFLICT', latest: existing },
        { status: 409 }
      );
    }

    const schedule = await prisma.schedule.upsert({
      where: { 
        userId_active: { 
          userId, 
          active: true 
        } 
      },
      update: { 
        planJson: JSON.stringify(plan),
        version: Date.now()
      },
      create: { 
        userId, 
        name: "مخصص", 
        weeklyHours: 0, 
        planJson: JSON.stringify(plan), 
        active: true,
        version: Date.now()
      },
    });
    
    return successResponse(schedule);
  } catch (error) {
    return handleApiError(error);
  }
}