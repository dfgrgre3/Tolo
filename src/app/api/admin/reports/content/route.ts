import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { successResponse, withAuth, handleApiError, badRequestResponse, forbiddenResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN" && authUser.userRole !== "MODERATOR") {
        return forbiddenResponse("غير مسموح لك بالوصول لتقارير المحتوى");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const status = searchParams.get("status");
        const type = searchParams.get("type");

        const reports = await prisma.contentReport.findMany({
          where: {
            ...(status && { status }),
            ...(type && { targetType: type })
          },
          include: {
            user: {
              select: { name: true, email: true, role: true }
            },
            subject: {
              select: { name: true, nameAr: true }
            }
          },
          orderBy: { createdAt: "desc" }
        });

        return successResponse(reports);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN" && authUser.userRole !== "MODERATOR") {
        return forbiddenResponse("ليس لديك صلاحية تحديث التقارير");
      }

      try {
        const body = await req.json();
        const { id, status, adminNote } = body;

        if (!id) return badRequestResponse("معرف التقرير مطلوب");

        const updatedReport = await prisma.contentReport.update({
          where: { id },
          data: {
            ...(status && { status }),
            ...(adminNote !== undefined && { adminNote })
          }
        });

        return successResponse(updatedReport, "تم تحديث حالة البلاغ بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}

export async function POST(request: NextRequest) {
  // Public reporting endpoint (for students)
  return opsWrapper(request, async (req) => {
    return withAuth(req, async (authUser) => {
      try {
        const body = await req.json();
        const { targetId, targetType, subjectId, issueType, description } = body;

        if (!targetId || !targetType || !description) {
          return badRequestResponse("بيانات البلاغ غير مكتملة");
        }

        const report = await prisma.contentReport.create({
          data: {
            userId: authUser.userId,
            targetId,
            targetType,
            subjectId,
            issueType,
            description,
            status: "PENDING"
          }
        });

        return successResponse(report, "تم إرسال بلاغك بنجاح. سنقوم بمراجعته فوراً.", 201);
      } catch (error) {
        return handleApiError(error);
      }
    });
  });
}