import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, withAdmin } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  return withAdmin(req, async () => {
    try {
      const rules = await prisma.automationRule.findMany({
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, rules });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function POST(req: NextRequest) {
  return withAdmin(req, async () => {
    try {
      const data = await req.json();
      const { name, triggerType, conditions, actionType, actionData, isActive } = data;

      const newRule = await prisma.automationRule.create({
        data: {
          name,
          triggerType,
          conditions: JSON.stringify(conditions),
          actionType,
          actionData: JSON.stringify(actionData),
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      return NextResponse.json({ success: true, rule: newRule });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function PUT(req: NextRequest) {
  return withAdmin(req, async () => {
    try {
      const data = await req.json();
      const { id, name, triggerType, conditions, actionType, actionData, isActive } = data;

      const updatedRule = await prisma.automationRule.update({
        where: { id },
        data: {
          name,
          triggerType,
          conditions: JSON.stringify(conditions),
          actionType,
          actionData: JSON.stringify(actionData),
          isActive,
        },
      });

      return NextResponse.json({ success: true, rule: updatedRule });
    } catch (error) {
      return handleApiError(error);
    }
  });
}

export async function DELETE(req: NextRequest) {
  return withAdmin(req, async () => {
    try {
      const { searchParams } = new URL(req.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ success: false, error: "Missing rule ID" }, { status: 400 });
      }

      await prisma.automationRule.delete({
        where: { id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  });
}
