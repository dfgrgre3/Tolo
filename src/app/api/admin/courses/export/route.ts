import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import {
  forbiddenResponse,
  handleApiError,
  withAuth,
} from "@/lib/api-utils";
import { logger } from "@/lib/logger";

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بتصدير البيانات");
      }

      try {
        const searchParams = req.nextUrl.searchParams;
        const type = searchParams.get("type") || "courses";
        const courseId = searchParams.get("courseId");

        if (type === "students" && courseId) {
          // Export students for a specific course
          const enrollments = await prisma.subjectEnrollment.findMany({
            where: { subjectId: courseId },
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                  level: true,
                  totalXP: true,
                  lastLogin: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          });

          const headers = ["الاسم", "البريد الإلكتروني", "الهاتف", "المستوى", "XP", "التقدم%", "تاريخ التسجيل", "آخر دخول"];
          const rows = enrollments.map((e: any) => [
            escapeCsvField(e.user.name),
            escapeCsvField(e.user.email),
            escapeCsvField(e.user.phone),
            escapeCsvField(e.user.level),
            escapeCsvField(e.user.totalXP),
            escapeCsvField(e.progress),
            escapeCsvField(e.createdAt.toISOString().split("T")[0]),
            escapeCsvField(e.user.lastLogin?.toISOString().split("T")[0]),
          ]);

          const csv = "\uFEFF" + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");

          return new NextResponse(csv, {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="students-${courseId}-${Date.now()}.csv"`,
            },
          });
        }

        // Export all courses
        const courses = await prisma.subject.findMany({
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: {
                enrollments: true,
                topics: true,
                reviews: true,
              },
            },
          },
        });

        const headers = [
          "المعرف", "الاسم (عربي)", "الاسم (إنجليزي)", "الكود", "المستوى",
          "السعر", "المدة (ساعات)", "المدرس", "منشورة", "نشطة",
          "عدد الطلاب", "عدد الوحدات", "عدد التقييمات", "التقييم",
          "تاريخ الإنشاء", "آخر تحديث"
        ];

        const levelLabels: Record<string, string> = {
          EASY: "مبتدئ",
          MEDIUM: "متوسط",
          HARD: "متقدم",
          EXPERT: "خبير",
        };

        const rows = courses.map((c: any) => [
          escapeCsvField(c.id),
          escapeCsvField(c.nameAr),
          escapeCsvField(c.name),
          escapeCsvField(c.code),
          escapeCsvField(levelLabels[c.level] || c.level),
          escapeCsvField(c.price),
          escapeCsvField(c.durationHours),
          escapeCsvField(c.instructorName),
          escapeCsvField(c.isPublished ? "نعم" : "لا"),
          escapeCsvField(c.isActive ? "نعم" : "لا"),
          escapeCsvField(c._count.enrollments),
          escapeCsvField(c._count.topics),
          escapeCsvField(c._count.reviews),
          escapeCsvField(c.rating),
          escapeCsvField(c.createdAt.toISOString().split("T")[0]),
          escapeCsvField(c.updatedAt.toISOString().split("T")[0]),
        ]);

        const csv = "\uFEFF" + [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="courses-export-${Date.now()}.csv"`,
          },
        });
      } catch (error) {
        logger.error("Error exporting courses data", error);
        return handleApiError(error);
      }
    })
  );
}
