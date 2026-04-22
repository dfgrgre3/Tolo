import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withAuth, opsWrapper } from "@/lib/api-middlewares";
import { logger } from "@/lib/logger";

export const GET = withAuth(async (req: NextRequest, { params }: { params: { id: string } }) => {
  return opsWrapper(async () => {
    const { id } = params;

    const certificate = await prisma.subjectCertificate.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          }
        },
        subject: {
          select: {
            nameAr: true,
            name: true,
            instructorName: true,
            id: true,
          }
        }
      }
    });

    if (!certificate) {
      return NextResponse.json({ error: "الشهادة غير موجودة" }, { status: 404 });
    }

    return NextResponse.json({ certificate });
  }, "Fetch Certificate");
});
