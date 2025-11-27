import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from "@/lib/logger";
import { TEACHER_ROLES, USER_ROLE } from '@/lib/constants';

export async function GET(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			// Query users with TEACHER or ADMIN role
			const teachers = await prisma.user.findMany({
				where: {
					role: {
						in: TEACHER_ROLES as unknown as string[]
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
					return teacher.subjectEnrollments.map(enrollment => ({
						id: teacher.id,
						name: teacher.name || teacher.email || "معلم",
						subject: enrollment.subject.name,
						onlineUrl: null
					}));
				}
				// If no subjects, return one entry with empty subject
				return [{
					id: teacher.id,
					name: teacher.name || teacher.email || "معلم",
					subject: "",
					onlineUrl: null
				}];
			});

			return NextResponse.json(teachersList, { status: 200 });
		} catch (error) {
			logger.error("Error fetching teachers:", error);
			return NextResponse.json(
				{ error: "Failed to fetch teachers" },
				{ status: 500 }
			);
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
				return NextResponse.json(
					{ error: "Email is required" },
					{ status: 400 }
				);
			}

			// Create or update user with TEACHER role
			const user = await prisma.user.upsert({
				where: { email },
				update: {
					name: name || undefined,
					role: USER_ROLE.TEACHER
				},
				create: {
					email,
					name: name || email,
					passwordHash: "", // Password should be set separately
					role: USER_ROLE.TEACHER
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

			return NextResponse.json({
				id: user.id,
				name: user.name || user.email,
				subject: subject || "",
				onlineUrl: onlineUrl || null
			}, { status: 201 });
		} catch (error) {
			logger.error("Error creating teacher:", error);
			return NextResponse.json(
				{ error: "Failed to create teacher" },
				{ status: 500 }
			);
		}
	});
} 