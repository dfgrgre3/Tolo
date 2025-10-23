import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withCache } from "@/lib/cache-middleware";
import { invalidateUserCache } from "@/lib/cache-invalidation-service";
import { getOrSetEnhanced } from '@/lib/cache-service-enhanced';

export async function GET(req: NextRequest) {
  return withCache(req, handleGetRequest, 'subjects', 600); // Cache for 10 minutes
}

async function handleGetRequest(req: NextRequest) {
	try {
		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");
		if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });
    
    // Use enhanced caching for frequently accessed subjects
    const cacheKey = `subjects:${userId}`;
    const subjects = await getOrSetEnhanced(
      cacheKey,
      async () => {
        return await prisma.subjectEnrollment.findMany({ 
          where: { userId },
          include: {
            subject: true
          }
        });
      },
      600 // 10 minutes TTL
    );
    
		return NextResponse.json(subjects);
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}

// POST - Enroll in a new subject
export async function POST(req: NextRequest) {
  try {
    const { userId, subjectId } = await req.json();
    
    if (!userId || !subjectId) {
      return NextResponse.json({ error: "userId and subjectId required" }, { status: 400 });
    }
    
    // Check if already enrolled
    const existingEnrollment = await prisma.subjectEnrollment.findUnique({
      where: {
        userId_subjectId: {
          userId,
          subjectId
        }
      }
    });
    
    if (existingEnrollment) {
      return NextResponse.json({ error: "Already enrolled in this subject" }, { status: 400 });
    }
    
    // Create enrollment
    const enrollment = await prisma.subjectEnrollment.create({
      data: {
        userId,
        subjectId
      },
      include: {
        subject: true
      }
    });
    
    // Invalidate user's subject cache
    await invalidateUserCache(userId, ['subjects']);
    
    return NextResponse.json(enrollment, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}

// DELETE - Unenroll from a subject
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const subjectId = searchParams.get("subjectId");
    
    if (!userId || !subjectId) {
      return NextResponse.json({ error: "userId and subjectId required" }, { status: 400 });
    }
    
    // Delete enrollment
    await prisma.subjectEnrollment.delete({
      where: {
        userId_subjectId: {
          userId,
          subjectId
        }
      }
    });
    
    // Invalidate user's subject cache
    await invalidateUserCache(userId, ['subjects']);
    
    return NextResponse.json({ message: "Unenrolled successfully" });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}