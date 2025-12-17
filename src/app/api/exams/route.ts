import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import { Prisma } from "@prisma/client";
import { SubjectType, ExamType } from "@/types/settings";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { randomUUID } from "crypto";
import {
	parseRequestBody,
	createStandardErrorResponse,
	createSuccessResponse,
	addSecurityHeaders
} from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			// Get query parameters
			const { searchParams } = new URL(req.url);
			const limitParam = searchParams.get('limit');
			const offsetParam = searchParams.get('offset');
			const subject = searchParams.get('subject');
			const year = searchParams.get('year');

			// Validate and parse limit
			let limit: number | undefined;
			if (limitParam) {
				limit = parseInt(limitParam, 10);
				if (isNaN(limit) || limit < 1 || limit > 100) {
					const response = NextResponse.json(
						{ error: "ط­ط¯ ط؛ظٹط± طµط­ظٹط­. ظٹط¬ط¨ ط£ظ† ظٹظƒظˆظ† ط¨ظٹظ† 1 ظˆ 100", code: 'INVALID_LIMIT' },
						{ status: 400 }
					);
					return addSecurityHeaders(response);
				}
			}

			// Validate and parse offset
			let offset: number | undefined;
			if (offsetParam) {
				offset = parseInt(offsetParam, 10);
				if (isNaN(offset) || offset < 0) {
					const response = NextResponse.json(
						{ error: "ط¥ط²ط§ط­ط© ط؛ظٹط± طµط­ظٹط­ط©. ظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط¹ط¯ط¯ طµط­ظٹط­ ظ…ظˆط¬ط¨", code: 'INVALID_OFFSET' },
						{ status: 400 }
					);
					return addSecurityHeaders(response);
				}
			}

			// Build where clause
			const where: Prisma.ExamWhereInput = {};
			if (subject && typeof subject === 'string' && subject.trim().length > 0) {
				where.subject = subject.trim();
			}
			if (year) {
				const yearNum = parseInt(year, 10);
				if (!isNaN(yearNum)) {
					where.year = yearNum;
				}
			}

			// Fetch exams with timeout protection
			const fetchPromise = prisma.exam.findMany({
				where: Object.keys(where).length > 0 ? where : undefined,
				orderBy: [{ year: "desc" }, { createdAt: "desc" }],
				...(limit && { take: limit }),
				...(offset && { skip: offset }),
			});

			const timeoutPromise = new Promise<never>((resolve, reject) => {
				setTimeout(() => reject(new Error('Database query timeout')), 10000);
			});

			const exams = await Promise.race([fetchPromise, timeoutPromise]);

			const response = NextResponse.json({
				exams,
				...(limit && { hasMore: exams.length === limit })
			});
			return addSecurityHeaders(response);
		} catch (error: unknown) {
			// طھط³ط¬ظٹظ„ ط§ظ„ط®ط·ط£ ط¨ط´ظƒظ„ ط£ظƒط«ط± طھظپطµظٹظ„ط§ظ‹ ظپظٹ ظˆط¶ط¹ ط§ظ„طھط·ظˆظٹط±
			if (process.env.NODE_ENV === 'development') {
				logger.error("Error fetching exams:", error);
			}

			// طھط­ط¯ظٹط¯ ط±ط³ط§ظ„ط© ط§ظ„ط®ط·ط£ ط§ظ„ظ…ظ†ط§ط³ط¨ط©
			let errorMessage = "ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¬ظ„ط¨ ط§ظ„ط§ظ…طھط­ط§ظ†ط§طھ";
			let errorDetails = "Unknown error";
			let errorCode = 'FETCH_ERROR';

			if (error instanceof Error) {
				errorDetails = error.message;

				// ط±ط³ط§ط¦ظ„ ط®ط·ط£ ط£ظƒط«ط± ظˆط¶ظˆط­ط§ظ‹ ظ„ظ„ظ…ط´ط§ظƒظ„ ط§ظ„ط´ط§ط¦ط¹ط©
				if (error.message.includes('did not initialize yet') ||
					error.message.includes('prisma generate') ||
					error.message.includes('has not been generated')) {
					errorMessage = "Prisma Client ظ„ظ… ظٹطھظ… طھظˆظ„ظٹط¯ظ‡. ظٹط±ط¬ظ‰ طھط´ط؛ظٹظ„: npx prisma generate";
					errorCode = 'PRISMA_NOT_INITIALIZED';
				} else if (error.message.includes('P1001') || error.message.includes('connection')) {
					errorMessage = "ظ„ط§ ظٹظ…ظƒظ† ط§ظ„ط§طھطµط§ظ„ ط¨ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ";
					errorCode = 'DATABASE_CONNECTION_ERROR';
				} else if (error.message.includes('table') || error.message.includes('does not exist')) {
					errorMessage = "ط¬ط¯ظˆظ„ ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ ط؛ظٹط± ظ…ظˆط¬ظˆط¯. ظٹط±ط¬ظ‰ طھط´ط؛ظٹظ„ migrations";
					errorCode = 'TABLE_NOT_FOUND';
				} else if (error.message.includes('timeout')) {
					errorMessage = "ط§ظ†طھظ‡طھ ظ…ظ‡ظ„ط© ط§ظ„ط·ظ„ط¨. ظٹط±ط¬ظ‰ ط§ظ„ظ…ط­ط§ظˆظ„ط© ظ…ط±ط© ط£ط®ط±ظ‰";
					errorCode = 'REQUEST_TIMEOUT';
				}
			} else {
				errorDetails = String(error);
			}

			return createStandardErrorResponse(
				error,
				errorMessage
			);
		}
	});
}

export async function POST(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			// Parse request body with timeout protection using standardized helper
			const bodyResult = await parseRequestBody<{
				subject?: string;
				title?: string;
				year?: number;
				url?: string;
				type?: ExamType;
			}>(req, {
				maxSize: 2048, // 2KB max
				required: true,
			});

			if (!bodyResult.success) {
				return bodyResult.error;
			}

			const body = bodyResult.data;

			const { subject, title, year, url, type = ExamType.OTHER } = body;

			// Validate required fields
			if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
				const response = NextResponse.json(
					{ error: "ط§ظ„ظ…ط§ط¯ط© ظ…ط·ظ„ظˆط¨ط©", code: 'MISSING_SUBJECT' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (!title || typeof title !== 'string' || title.trim().length === 0) {
				const response = NextResponse.json(
					{ error: "ط§ظ„ط¹ظ†ظˆط§ظ† ظ…ط·ظ„ظˆط¨", code: 'MISSING_TITLE' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (!year || typeof year !== 'number' || year < 1900 || year > 2100) {
				const response = NextResponse.json(
					{ error: "ط§ظ„ط³ظ†ط© ظ…ط·ظ„ظˆط¨ط© ظˆظٹط¬ط¨ ط£ظ† طھظƒظˆظ† ط¨ظٹظ† 1900 ظˆ 2100", code: 'INVALID_YEAR' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			// Validate field lengths
			if (subject.trim().length > 200) {
				const response = NextResponse.json(
					{ error: "ط§ط³ظ… ط§ظ„ظ…ط§ط¯ط© ط·ظˆظٹظ„ ط¬ط¯ط§ظ‹ (ط§ظ„ط­ط¯ ط§ظ„ط£ظ‚طµظ‰ 200 ط­ط±ظپ)", code: 'SUBJECT_TOO_LONG' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (title.trim().length > 500) {
				const response = NextResponse.json(
					{ error: "ط§ظ„ط¹ظ†ظˆط§ظ† ط·ظˆظٹظ„ ط¬ط¯ط§ظ‹ (ط§ظ„ط­ط¯ ط§ظ„ط£ظ‚طµظ‰ 500 ط­ط±ظپ)", code: 'TITLE_TOO_LONG' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			// Validate URL format if provided
			if (url && typeof url === 'string' && url.trim().length > 0) {
				try {
					new URL(url.trim());
				} catch {
					const response = NextResponse.json(
						{ error: "طھظ†ط³ظٹظ‚ ط§ظ„ط±ط§ط¨ط· ط؛ظٹط± طµط­ظٹط­", code: 'INVALID_URL' },
						{ status: 400 }
					);
					return addSecurityHeaders(response);
				}
			}

			// Validate type
			if (!Object.values(ExamType).includes(type)) {
				const response = NextResponse.json(
					{ error: "ظ†ظˆط¹ ط§ظ„ط§ظ…طھط­ط§ظ† ط؛ظٹط± طµط­ظٹط­", code: 'INVALID_TYPE' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			// ط¥ظ†ط´ط§ط، ط§ظ…طھط­ط§ظ† ط¬ط¯ظٹط¯ ظ…ط¹ timeout protection
			const createPromise = prisma.exam.create({
				data: {
					id: randomUUID(),
					subject: subject.trim(),
					title: title.trim(),
					year: Number(year),
					url: (url && typeof url === 'string') ? url.trim() : "",
					type
				}
			});

			const createTimeoutPromise = new Promise<never>((resolve, reject) => {
				setTimeout(() => reject(new Error('Database operation timeout')), 10000);
			});

			const newExam = await Promise.race([createPromise, createTimeoutPromise]);

			return createSuccessResponse({
				success: true,
				exam: newExam
			}, undefined, 201);
		} catch (error) {
			logger.error("Error creating exam:", error);
			return createStandardErrorResponse(
				error,
				"ط­ط¯ط« ط®ط·ط£ ظپظٹ ط¥ظ†ط´ط§ط، ط§ظ„ط§ظ…طھط­ط§ظ†"
			);
		}
	});
}