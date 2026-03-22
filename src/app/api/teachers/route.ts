import { NextRequest } from "next/server";
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";
import { TEACHER_ROLES, UserRole } from '@/lib/constants';
import { successResponse, handleApiError, badRequestResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			// Query users with TEACHER or ADMIN role
			const teachers = await prisma.user.findMany({
				where: {
					role: {
						in: [...TEACHER_ROLES]
					}
				},
				select: {
					id: true,
					name: true,
					email: true,
					avatar: true,
					subjectEnrollments: {
						select: {
							subject: {
								select: {
									name: true
								}
							}
						}
					}
				}
			});

			// Transform the data to match the expected format
			// If a teacher has multiple subjects, create one entry per subject
			const teachersList = teachers.flatMap(teacher => {
				// If teacher has subjects, create one entry per subject
				if (teacher.subjectEnrollments && teacher.subjectEnrollments.length > 0) {
					return teacher.subjectEnrollments.map((enrollment: any) => ({
						id: teacher.id,
						name: teacher.name || teacher.email || "8&7?88&",
						subject: enrollment.subject.name,
						onlineUrl: null
					}));
				}
				// If no subjects, return one entry with empty subject
				return [{
					id: teacher.id,
					name: teacher.name || teacher.email || "8&7?88&",
					subject: "",
					onlineUrl: null
				}];
			});

			return successResponse(teachersList);
		} catch (error) {
			return handleApiError(error);
		}
	});
}

export async function POST(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		try {
			const body = await request.json();
			const { name, email, subject, onlineUrl } = body;

			// Validate required fields
			if (!email) {
				return badRequestResponse("Email is required");
			}

			// Create or update user with TEACHER role
			const user = await prisma.user.upsert({
				where: { email },
				update: {
					name: name || undefined,
					role: UserRole.TEACHER
				},
				create: {
					email,
					name: name || email,
					passwordHash: "", // Password should be set separately
					role: UserRole.TEACHER
				}
			});

			// If subject is provided, create enrollment
			if (subject) {
				// Check if enrollment already exists
				const existingEnrollment = await prisma.subjectEnrollment.findFirst({
					where: {
						userId: user.id,
						subjectId: subject
					}
				});

				if (!existingEnrollment) {
					await prisma.subjectEnrollment.create({
						data: {
							id: `${user.id}_${subject}_${Date.now()}`,
							userId: user.id,
							subjectId: subject
						}
					});
				}
			}

			return successResponse({
				id: user.id,
				name: user.name || user.email,
				subject: subject || "",
				onlineUrl: onlineUrl || null
			}, undefined, 201);
		} catch (error) {
			return handleApiError(error);
		}
	});
} 