import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SubjectType, FocusStrategy } from "@/types/settings";
import { SettingsUpdateRequest } from "@/types/settings";
import { verifyToken } from "@/lib/auth-service";
import { randomUUID } from "crypto";
import { logger } from '@/lib/logger';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { 
  parseRequestBody, 
  createStandardErrorResponse, 
  createSuccessResponse,
  addSecurityHeaders 
} from '@/app/api/auth/_helpers';

export async function GET(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		try {
			// Authenticate user
			const authUser = verifyToken(request);
			if (!authUser) {
				return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
			}

			const { searchParams } = new URL(request.url);
		const userId = searchParams.get("userId");

		// If userId is provided in query, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			const response = NextResponse.json({ error: "Forbidden: Can only access your own settings", code: 'FORBIDDEN' }, { status: 403 });
			return addSecurityHeaders(response);
		}

		// Use authenticated user's ID if no userId provided in query
		const targetUserId = userId || authUser.userId;

			// Fetch user with timeout protection
			const userPromise = prisma.user.findUnique({
				where: { id: targetUserId },
				select: { id: true, wakeUpTime: true, sleepTime: true, focusStrategy: true }
			});

			const userTimeoutPromise = new Promise<never>((resolve, reject) => {
				setTimeout(() => reject(new Error('Database query timeout')), 5000);
			});

			const user = await Promise.race([userPromise, userTimeoutPromise]);

			const subjectsPromise = prisma.subjectEnrollment.findMany({
				where: { userId: targetUserId },
				orderBy: { subjectId: "asc" }
			});

			const subjectsTimeoutPromise = new Promise<never>((resolve, reject) => {
				setTimeout(() => reject(new Error('Database query timeout')), 5000);
			});

			const subjects = await Promise.race([subjectsPromise, subjectsTimeoutPromise]);

			return createSuccessResponse({ user, subjects });
		} catch (e: any) {
			logger.error("Error fetching settings:", e);
			return createStandardErrorResponse(
				e,
				e?.message ?? "Server error"
			);
		}
	});
}

export async function POST(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		try {
			// Authenticate user with timeout protection
			const verifyPromise = Promise.resolve(verifyToken(request));
			const verifyTimeoutPromise = new Promise<null>((resolve) => {
				setTimeout(() => resolve(null), 5000); // 5 second timeout
			});

			const authUser = await Promise.race([verifyPromise, verifyTimeoutPromise]);
			if (!authUser) {
				const response = NextResponse.json({ error: "Unauthorized", code: 'UNAUTHORIZED' }, { status: 401 });
				return addSecurityHeaders(response);
			}

			// Parse request body with timeout protection using standardized helper
			const bodyResult = await parseRequestBody<SettingsUpdateRequest>(request, {
				maxSize: 4096, // 4KB max for settings
				required: true,
			});

			if (!bodyResult.success) {
				return bodyResult.error;
			}

			const body = bodyResult.data;
			const { userId, wakeUpTime, sleepTime, focusStrategy, subjects } = body;

		// If userId is provided in body, ensure it matches the authenticated user
		if (userId && userId !== authUser.userId) {
			const response = NextResponse.json({ error: "Forbidden: Can only update your own settings", code: 'FORBIDDEN' }, { status: 403 });
			return addSecurityHeaders(response);
		}

		// Use authenticated user's ID if no userId provided in body
		const targetUserId = userId || authUser.userId;

		// Verify user exists with timeout protection
		const userExistsPromise = prisma.user.findUnique({
			where: { id: targetUserId },
			select: { id: true }
		});

		const userExistsTimeoutPromise = new Promise<never>((resolve, reject) => {
			setTimeout(() => reject(new Error('Database query timeout')), 5000);
		});

		const userExists = await Promise.race([userExistsPromise, userExistsTimeoutPromise]);

		if (!userExists) {
			const response = NextResponse.json({ error: "User not found", code: 'USER_NOT_FOUND' }, { status: 404 });
			return addSecurityHeaders(response);
		}

		// Update user settings with timeout protection
		const updateUserPromise = prisma.user.update({
			where: { id: targetUserId },
			data: {
				wakeUpTime: wakeUpTime ?? null,
				sleepTime: sleepTime ?? null,
				focusStrategy: focusStrategy ?? null
			}
		});

		const updateUserTimeoutPromise = new Promise<never>((resolve, reject) => {
			setTimeout(() => reject(new Error('Database update timeout')), 10000);
		});

		await Promise.race([updateUserPromise, updateUserTimeoutPromise]);

		// Update subject enrollments
		if (Array.isArray(subjects) && subjects.length > 0) {
			try {
				// Get existing enrollments
				const existing = await prisma.subjectEnrollment.findMany({ 
					where: { userId: targetUserId } 
				});
				
				// Create a map for quick lookup
				type EnrollmentType = { subjectId: string; id: string };
				const existingMap = new Map<string, EnrollmentType>(existing.map((e: EnrollmentType) => [e.subjectId, e]));
				const incomingSubjects = new Set(subjects.map((s: { subject: string }) => s.subject));
				
				// Delete enrollments that are not in the incoming list
				const toDelete = existing
					.filter((e: EnrollmentType) => !incomingSubjects.has(e.subjectId))
					.map((e: EnrollmentType) => e.id);
				
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
						logger.warn(`Invalid subject type: ${s.subject}, skipping`);
						continue;
					}

					// Validate targetWeeklyHours
					const hours = Math.max(0, Math.floor(s.targetWeeklyHours || 0));

					// Find existing enrollment
					const existingEnrollment: EnrollmentType | undefined = existingMap.get(s.subject);

					if (existingEnrollment) {
						// Update existing enrollment
						updatePromises.push(
							prisma.subjectEnrollment.update({
								where: { id: existingEnrollment.id },
								data: { targetWeeklyHours: hours }
							}).catch((err: unknown) => {
								logger.error(`Error updating enrollment for ${s.subject}:`, err);
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
									subjectId: s.subject,
									targetWeeklyHours: hours
								}
							}).catch(async (err: unknown) => {
								logger.error(`Error creating enrollment for ${s.subject}:`, err);
								// If creation fails due to duplicate, try to update instead
								const error = err as { code?: string; message?: string };
								if (error?.code === 'P2002' || error?.message?.includes('Unique constraint') || error?.message?.includes('UNIQUE constraint')) {
									const existing = await prisma.subjectEnrollment.findFirst({
										where: { userId: targetUserId, subjectId: s.subject }
									});
									if (existing) {
										return prisma.subjectEnrollment.update({
											where: { id: existing.id },
											data: { targetWeeklyHours: hours }
										});
									}
								}
								// For other errors, log but don't fail the whole operation
								logger.error(`Failed to create/update enrollment for ${s.subject} after retry`);
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
						logger.error(`Failed to process subject enrollment ${index}:`, result.reason);
					}
				});
			} catch (subjectError: any) {
				logger.error("Error updating subject enrollments:", subjectError);
				// Don't throw - user settings were updated successfully
				// Just log the error
				if (process.env.NODE_ENV === 'development') {
					logger.error("Subject enrollment error details:", {
						message: subjectError?.message,
						code: subjectError?.code,
						stack: subjectError?.stack
					});
				}
			}
		}

			return createSuccessResponse({ ok: true, message: "Settings updated successfully" });
		} catch (e: any) {
			logger.error("Error updating settings:", e);
			return createStandardErrorResponse(
				e,
				e?.message || "Server error"
			);
		}
	});
}
