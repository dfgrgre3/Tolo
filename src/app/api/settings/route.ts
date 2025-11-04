import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubjectType, FocusStrategy } from "@/types/settings";
import { SettingsUpdateRequest } from "@/types/settings";
import { verifyToken } from "@/lib/auth-enhanced";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
	try {
		// Authenticate user
		const authUser = verifyToken(req);
		if (!authUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const { searchParams } = new URL(req.url);
		const userId = searchParams.get("userId");

		// If userId is provided in query, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			return NextResponse.json({ error: "Forbidden: Can only access your own settings" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in query
		const targetUserId = userId || authUser.userId;

		const user = await prisma.user.findUnique({
			where: { id: targetUserId },
			select: { id: true, wakeUpTime: true, sleepTime: true, focusStrategy: true }
		});

		const subjects = await prisma.subjectEnrollment.findMany({
			where: { userId: targetUserId },
			orderBy: { subject: "asc" }
		});

		return NextResponse.json({ user, subjects });
	} catch (e: any) {
		return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest) {
	try {
		// Authenticate user
		const authUser = verifyToken(req);
		if (!authUser) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const body: SettingsUpdateRequest = await req.json();
		const { userId, wakeUpTime, sleepTime, focusStrategy, subjects } = body;

		// If userId is provided in body, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			return NextResponse.json({ error: "Forbidden: Can only update your own settings" }, { status: 403 });
		}

		// Use authenticated user's ID if no userId provided in body
		const targetUserId = userId || authUser.userId;

		// Verify user exists
		const userExists = await prisma.user.findUnique({
			where: { id: targetUserId },
			select: { id: true }
		});

		if (!userExists) {
			return NextResponse.json({ error: "User not found" }, { status: 404 });
		}

		// Update user settings
		await prisma.user.update({
			where: { id: targetUserId },
			data: {
				wakeUpTime: wakeUpTime ?? null,
				sleepTime: sleepTime ?? null,
				focusStrategy: focusStrategy ?? null
			}
		});

		// Update subject enrollments
		if (Array.isArray(subjects) && subjects.length > 0) {
			try {
				// Get existing enrollments
				const existing = await prisma.subjectEnrollment.findMany({ 
					where: { userId: targetUserId } 
				});
				
				// Create a map for quick lookup
				const existingMap = new Map(existing.map(e => [e.subject, e]));
				const incomingSubjects = new Set(subjects.map((s) => s.subject));
				
				// Delete enrollments that are not in the incoming list
				const toDelete = existing
					.filter((e) => !incomingSubjects.has(e.subject))
					.map((e) => e.id);
				
				if (toDelete.length > 0) {
					await prisma.subjectEnrollment.deleteMany({ 
						where: { id: { in: toDelete } } 
					});
				}

				// Process each subject enrollment
				const updatePromises: Promise<any>[] = [];
				
				for (const s of subjects) {
					// Validate subject type
					if (!Object.values(SubjectType).includes(s.subject as SubjectType)) {
						console.warn(`Invalid subject type: ${s.subject}, skipping`);
						continue;
					}

					// Validate targetWeeklyHours
					const hours = Math.max(0, Math.floor(s.targetWeeklyHours || 0));

					// Find existing enrollment
					const existingEnrollment = existingMap.get(s.subject);

					if (existingEnrollment) {
						// Update existing enrollment
						updatePromises.push(
							prisma.subjectEnrollment.update({
								where: { id: existingEnrollment.id },
								data: { targetWeeklyHours: hours }
							}).catch((err) => {
								console.error(`Error updating enrollment for ${s.subject}:`, err);
								throw err;
							})
						);
					} else {
						// Create new enrollment with duplicate handling
						updatePromises.push(
							prisma.subjectEnrollment.create({
								data: {
									id: randomUUID(),
									userId: targetUserId,
									subject: s.subject,
									targetWeeklyHours: hours
								}
							}).catch(async (err) => {
								console.error(`Error creating enrollment for ${s.subject}:`, err);
								// If creation fails due to duplicate, try to update instead
								if (err?.code === 'P2002' || err?.message?.includes('Unique constraint') || err?.message?.includes('UNIQUE constraint')) {
									const existing = await prisma.subjectEnrollment.findFirst({
										where: { userId: targetUserId, subject: s.subject }
									});
									if (existing) {
										return prisma.subjectEnrollment.update({
											where: { id: existing.id },
											data: { targetWeeklyHours: hours }
										});
									}
								}
								// For other errors, log but don't fail the whole operation
								console.error(`Failed to create/update enrollment for ${s.subject} after retry`);
								return null; // Return null to indicate skipped
							})
						);
					}
				}

				// Execute all updates/creates
				const results = await Promise.allSettled(updatePromises);
				
				// Log any failures
				results.forEach((result, index) => {
					if (result.status === 'rejected') {
						console.error(`Failed to process subject enrollment ${index}:`, result.reason);
					}
				});
			} catch (subjectError: any) {
				console.error("Error updating subject enrollments:", subjectError);
				// Don't throw - user settings were updated successfully
				// Just log the error
				if (process.env.NODE_ENV === 'development') {
					console.error("Subject enrollment error details:", {
						message: subjectError?.message,
						code: subjectError?.code,
						stack: subjectError?.stack
					});
				}
			}
		}

		return NextResponse.json({ ok: true, message: "Settings updated successfully" });
	} catch (e: any) {
		console.error("Error updating settings:", e);
		// Log detailed error for debugging
		const errorMessage = e?.message || "Server error";
		const errorDetails = process.env.NODE_ENV === 'development' 
			? { message: errorMessage, stack: e?.stack, name: e?.name }
			: { message: errorMessage };
		
		return NextResponse.json({ 
			error: errorMessage,
			...(process.env.NODE_ENV === 'development' && { details: errorDetails })
		}, { status: 500 });
	}
}
