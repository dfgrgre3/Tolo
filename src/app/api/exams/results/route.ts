import { NextRequest } from "next/server";
import { prisma } from '@/lib/db';
import { gamificationService } from "@/lib/services/gamification-service";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { withAuth, successResponse, badRequestResponse, handleApiError } from '@/lib/api-utils';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		return withAuth(request, async ({ userId }) => {
			try {
				const results = await prisma.examResult.findMany({
					where: { userId },
					include: {
						exam: true
					},
					orderBy: { takenAt: "desc" }
				});
				return successResponse(results);
			} catch (e: unknown) {
				logger.error('Error fetching exam results:', e);
				return handleApiError(e);
			}
		});
	});
}

export async function POST(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		return withAuth(request, async ({ userId }) => {
			try {
				const body = await request.json();
				const { examId, score, takenAt, teacherId } = body;
				if (!examId || typeof score !== "number") return badRequestResponse("examId and score are required");
				const result = await prisma.examResult.create({
					data: {
						userId,
						examId,
						score,
						takenAt: takenAt ? new Date(takenAt) : undefined,
						teacherId
					},
					include: {
						exam: true
					}
				});

				// Trigger gamification for exam completion
				try {
					await gamificationService.updateUserProgress(userId, 'exam_completed', { score });
				} catch (gamificationError) {
					logger.error('Error updating gamification for exam:', gamificationError);
					// Don't fail the request if gamification fails
				}

				return successResponse(result);
			} catch (e: unknown) {
				logger.error('Error saving exam result:', e);
				return handleApiError(e);
			}
		});
	});
} 