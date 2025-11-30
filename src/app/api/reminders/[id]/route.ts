import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth-service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
	try {
		const { id } = await params;

		// Authenticate user
		const authUser = verifyToken(req);
		if (!authUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body = await req.json();

		// Validate that the reminder belongs to the authenticated user
		const existingReminder = await prisma.reminder.findFirst({
			where: {
				id,
				userId: authUser.userId
			}
		});

		if (!existingReminder) {
			return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
		}

		// Whitelist allowed fields to prevent mass assignment
		const allowedFields = ['title', 'description', 'scheduledAt', 'completed', 'priority'];
		const updates: Record<string, unknown> = {};

		for (const field of allowedFields) {
			if (field in body) {
				if (field === 'scheduledAt' && typeof body[field] === 'string') {
					updates[field] = new Date(body[field]);
				} else {
					updates[field] = body[field];
				}
			}
		}

		// Prevent changing userId through mass assignment
		if ('userId' in body) {
			return NextResponse.json({ error: 'Cannot change reminder ownership' }, { status: 400 });
		}

		const reminder = await prisma.reminder.update({ where: { id }, data: updates as any });
		return NextResponse.json(reminder);
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : "Server error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
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

		// Validate that the reminder belongs to the authenticated user before deletion
		const existingReminder = await prisma.reminder.findFirst({
			where: {
				id,
				userId: authUser.userId
			}
		});

		if (!existingReminder) {
			return NextResponse.json({ error: 'Reminder not found' }, { status: 404 });
		}

		await prisma.reminder.delete({ where: { id } });
		return NextResponse.json({ ok: true });
	} catch (e: unknown) {
		const errorMessage = e instanceof Error ? e.message : "Server error";
		return NextResponse.json({ error: errorMessage }, { status: 500 });
	}
}
