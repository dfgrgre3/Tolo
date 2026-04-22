import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { successResponse, handleApiError, badRequestResponse, withAdmin } from '@/lib/api-utils';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { z } from "zod";

const teacherSchema = z.object({
  userId: z.string().min(1, "معرف المستخدم مطلوب"),
  name: z.string().min(1, "اسم المعلم مطلوب"),
  subjectId: z.string().optional(),
  onlineUrl: z.string().optional(),
  notes: z.string().optional(),
  rating: z.number().default(0)
});

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    const teachers = await prisma.teacher.findMany({
      include: {
        subjects: {
          select: { name: true, nameAr: true, color: true }
        }
      },
      orderBy: { name: "asc" }
    });

    return successResponse({ teachers });
  })
  );
}

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const bodyRaw = await req.json();
      const validation = teacherSchema.safeParse(bodyRaw);
      if (!validation.success) {
        return badRequestResponse(validation.error.errors[0]?.message || "Invalid payload");
      }

      const { subjectId, userId, ...data } = validation.data;
      const teacher = await prisma.teacher.create({
        data: {
          ...data,
          user: { connect: { id: userId } },
          subjects: subjectId ? { connect: { id: subjectId } } : undefined
        }
      });

      return successResponse(teacher, "تم إضافة المعلم بنجاح", 201);
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function PATCH(request: NextRequest) {
  const updateSchema = teacherSchema.partial().extend({ id: z.string().min(1) });

  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const bodyRaw = await req.json();
      const validation = updateSchema.safeParse(bodyRaw);
      if (!validation.success) {
        return badRequestResponse(validation.error.errors[0]?.message || "Invalid payload");
      }

      const { id, subjectId, userId, ...data } = validation.data;

      // Prepare update data
      const updateData: any = { ...data };

      if (userId) {
        updateData.user = { connect: { id: userId } };
      }

      if (subjectId) {
        updateData.subjects = { set: [{ id: subjectId }] };
      }

      const teacher = await prisma.teacher.update({
        where: { id },
        data: updateData
      });

      return successResponse(teacher, "تم تحديث بيانات المعلم بنجاح");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}

export async function DELETE(request: NextRequest) {
  const deleteSchema = z.object({ id: z.string().min(1) });

  return opsWrapper(request, async (req) =>
  withAdmin(req, async () => {
    try {
      const bodyRaw = await req.json();
      const validation = deleteSchema.safeParse(bodyRaw);
      if (!validation.success) {
        return badRequestResponse(validation.error.errors[0]?.message || "Invalid payload");
      }

      await prisma.teacher.delete({
        where: { id: validation.data.id }
      });

      return successResponse({ success: true }, "تم حذف المعلم بنجاح");
    } catch (error) {
      return handleApiError(error);
    }
  })
  );
}