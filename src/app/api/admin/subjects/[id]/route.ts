import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  badRequestResponse,
  forbiddenResponse,
  handleApiError,
  notFoundResponse,
  successResponse,
  withAuth,
} from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بالوصول إلى تفاصيل المادة");
      }

      try {
        const { id } = await params;

        const subject = await prisma.subject.findUnique({
          where: { id },
          include: {
            _count: {
              select: {
                books: true,
                exams: true,
                resources: true,
                enrollments: true,
                studySessions: true,
              },
            },
            books: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                title: true,
                author: true,
                _count: {
                  select: {
                    progresses: true,
                  },
                },
              },
            },
            exams: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                title: true,
                isActive: true,
                _count: {
                  select: {
                    results: true,
                  },
                },
              },
            },
            enrollments: {
              orderBy: [
                { user: { xp: { totalXP: "desc" } } },
                { createdAt: "desc" },
              ],
              take: 10,
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    xp: {
                      select: {
                        totalXP: true,
                        level: true,
                      }
                    }
                  },
                },
              },
            },
            studySessions: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                createdAt: true,
                durationMin: true,
                user: {
                  select: {
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        });

        if (!subject) {
          return notFoundResponse("المادة غير موجودة");
        }

        return successResponse({
          id: subject.id,
          name: subject.name,
          nameAr: subject.nameAr,
          description: subject.description,
          type: subject.type ?? "CORE",
          icon: subject.icon,
          color: subject.color,
          level: subject.level,
          createdAt: subject.createdAt.toISOString(),
          updatedAt: subject.updatedAt.toISOString(),
          _count: subject._count,
          books: subject.books.map((book: { id: string; title: string; author: string | null; _count: { progresses: number } }) => ({
            id: book.id,
            title: book.title,
            author: book.author,
            _count: {
              chapters: book._count.progresses,
            },
          })),
          exams: subject.exams.map((exam: any) => ({
            id: exam.id,
            title: exam.title,
            duration: 0,
            isActive: exam.isActive,
            _count: exam._count,
          })),
          topStudents: subject.enrollments.map((enrollment: any) => ({
            id: enrollment.user.id,
            name: enrollment.user.name,
            email: enrollment.user.email,
            avatar: enrollment.user.avatar,
            totalXP: enrollment.user.xp?.totalXP || 0,
            level: enrollment.user.xp?.level || 1,
          })),
          recentActivity: subject.studySessions.map((session: {
            id: string;
            createdAt: Date;
            durationMin: number;
            user: {
              name: string | null;
              email: string;
              avatar: string | null;
            };
          }) => ({
            id: session.id,
            type: `جلسة مذاكرة لمدة ${session.durationMin} دقيقة`,
            createdAt: session.createdAt.toISOString(),
            user: session.user,
          })),
        });
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بتعديل المادة");
      }

      try {
        const { id } = await params;
        const body = await req.json();

        const updatedSubject = await prisma.subject.update({
          where: { id },
          data: body,
        });

        return successResponse(updatedSubject, "تم تحديث المادة بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (authUser.userRole !== "ADMIN") {
        return forbiddenResponse("غير مسموح لك بحذف المادة");
      }

      try {
        const { id } = await params;

        if (!id) {
          return badRequestResponse("معرف المادة مطلوب");
        }

        await prisma.subject.delete({
          where: { id },
        });

        return successResponse({ success: true }, "تم حذف المادة بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}
