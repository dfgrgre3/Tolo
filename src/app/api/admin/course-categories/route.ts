import { CategoryType } from "@prisma/client";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { badRequestResponse, forbiddenResponse, handleApiError, successResponse, withAuth } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

const categorySchema = z.object({
  name: z.string().min(1, "اسم التصنيف مطلوب"),
  description: z.string().optional().nullable(),
  icon: z.string().optional().nullable(),
  slug: z.string().optional().nullable(),
});

function normalizeOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureAdmin(userRole: string) {
  return userRole === "ADMIN";
}

async function getCourseCategories() {
  const [categories, subjectCounts] = await Promise.all([
    prisma.category.findMany({
      where: {
        type: CategoryType.COURSE,
      },
      orderBy: {
        name: "asc",
      },
    }),
    (prisma.subject as any).groupBy({
      by: ["categoryId"],
      where: {
        categoryId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const countsMap = new Map<string, number>();
  for (const row of subjectCounts) {
    if (row.categoryId) {
      countsMap.set(row.categoryId, row._count._all);
    }
  }

  return categories.map((category: {
    id: string;
    name: string;
    description: string | null;
    slug: string;
    icon: string | null;
    type: CategoryType;
    createdAt: Date;
    updatedAt: Date;
  }) => ({
    ...category,
    coursesCount: countsMap.get(category.id) ?? 0,
  }));
}

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بالوصول");
      }

      try {
        const categories = await getCourseCategories();
        return successResponse({ categories });
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بإنشاء تصنيفات");
      }

      try {
        const body = await req.json();
        const parsed = categorySchema.safeParse({
          name: typeof body?.name === "string" ? body.name.trim() : body?.name,
          description: normalizeOptionalString(body?.description),
          icon: normalizeOptionalString(body?.icon),
          slug: normalizeOptionalString(body?.slug),
        });

        if (!parsed.success) {
          return badRequestResponse(parsed.error.errors[0]?.message || "بيانات التصنيف غير صحيحة");
        }

        const slug = parsed.data.slug || slugify(parsed.data.name);
        if (!slug) {
          return badRequestResponse("تعذر إنشاء رابط التصنيف");
        }

        const existing = await prisma.category.findFirst({
          where: {
            OR: [{ name: parsed.data.name }, { slug }],
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          return badRequestResponse("يوجد تصنيف آخر بنفس الاسم أو الرابط");
        }

        const category = await prisma.category.create({
          data: {
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            icon: parsed.data.icon ?? null,
            slug,
            type: CategoryType.COURSE,
          },
        });

        return successResponse({ category }, "تم إنشاء التصنيف بنجاح", 201);
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function PATCH(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بتعديل التصنيفات");
      }

      try {
        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id : "";

        if (!id) {
          return badRequestResponse("معرف التصنيف مطلوب");
        }

        const parsed = categorySchema.safeParse({
          name: typeof body?.name === "string" ? body.name.trim() : body?.name,
          description: normalizeOptionalString(body?.description),
          icon: normalizeOptionalString(body?.icon),
          slug: normalizeOptionalString(body?.slug),
        });

        if (!parsed.success) {
          return badRequestResponse(parsed.error.errors[0]?.message || "بيانات التصنيف غير صحيحة");
        }

        const slug = parsed.data.slug || slugify(parsed.data.name);
        if (!slug) {
          return badRequestResponse("تعذر إنشاء رابط التصنيف");
        }

        const existing = await prisma.category.findFirst({
          where: {
            id: {
              not: id,
            },
            OR: [{ name: parsed.data.name }, { slug }],
          },
          select: {
            id: true,
          },
        });

        if (existing) {
          return badRequestResponse("يوجد تصنيف آخر بنفس الاسم أو الرابط");
        }

        const category = await prisma.category.update({
          where: {
            id,
          },
          data: {
            name: parsed.data.name,
            description: parsed.data.description ?? null,
            icon: parsed.data.icon ?? null,
            slug,
          },
        });

        return successResponse({ category }, "تم تحديث التصنيف بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}

export async function DELETE(request: NextRequest) {
  return opsWrapper(request, async (req) =>
    withAuth(req, async (authUser) => {
      if (!ensureAdmin(authUser.userRole)) {
        return forbiddenResponse("غير مسموح لك بحذف التصنيفات");
      }

      try {
        const body = await req.json();
        const id = typeof body?.id === "string" ? body.id : "";

        if (!id) {
          return badRequestResponse("معرف التصنيف مطلوب");
        }

        const attachedCourses = await prisma.subject.count({
          where: {
            categoryId: id,
          },
        });

        if (attachedCourses > 0) {
          return badRequestResponse(`لا يمكن حذف هذا التصنيف لارتباطه بعدد ${attachedCourses} دورة`);
        }

        await prisma.category.delete({
          where: {
            id,
          },
        });

        return successResponse({ success: true }, "تم حذف التصنيف بنجاح");
      } catch (error) {
        return handleApiError(error);
      }
    })
  );
}
