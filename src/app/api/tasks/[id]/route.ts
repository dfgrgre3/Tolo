import { NextRequest, NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-enhanced";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Authenticate user
    const authUser = verifyToken(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const task = await prisma.task.findFirst({
      where: {
        id,
        userId: authUser.userId // Ensure user can only access their own tasks
      }
    });

    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Authenticate user
    const authUser = verifyToken(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Validate that the task belongs to the authenticated user
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: authUser.userId
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Whitelist allowed fields to prevent mass assignment vulnerability
    const allowedFields = ['title', 'description', 'completed', 'priority', 'dueAt', 'subject', 'category'];
    const updates: any = {};

    for (const field of allowedFields) {
      if (field in data) {
        if (field === 'dueAt' && typeof data[field] === 'string') {
          updates[field] = new Date(data[field]);
        } else if (field === 'subject' && data[field] === '') {
          updates[field] = null;
        } else if (field === 'description' && data[field] === '') {
          updates[field] = null;
        } else {
          updates[field] = data[field];
        }
      }
    }

    // Prevent changing userId through mass assignment
    if ('userId' in data) {
      return NextResponse.json({ error: 'Cannot change task ownership' }, { status: 400 });
    }

    const updated = await prisma.task.update({
      where: { id },
      data: updates,
    });
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Authenticate user
    const authUser = verifyToken(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate that the task belongs to the authenticated user before deletion
    const existingTask = await prisma.task.findFirst({
      where: {
        id,
        userId: authUser.userId
      }
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
