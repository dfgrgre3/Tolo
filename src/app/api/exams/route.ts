import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
						{ error: "حد غير صحيح. يجب أن يكون بين 1 و 100", code: 'INVALID_LIMIT' },
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
						{ error: "إزاحة غير صحيحة. يجب أن تكون عدد صحيح موجب", code: 'INVALID_OFFSET' },
						{ status: 400 }
					);
					return addSecurityHeaders(response);
				}
			}

			// Build where clause
			const where: any = {};
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
		} catch (error) {
			// تسجيل الخطأ بشكل أكثر تفصيلاً في وضع التطوير
			if (process.env.NODE_ENV === 'development') {
				logger.error("Error fetching exams:", error);
			}
			
			// تحديد رسالة الخطأ المناسبة
			let errorMessage = "حدث خطأ في جلب الامتحانات";
			let errorDetails = "Unknown error";
			let errorCode = 'FETCH_ERROR';
			
			if (error instanceof Error) {
				errorDetails = error.message;
				
				// رسائل خطأ أكثر وضوحاً للمشاكل الشائعة
				if (error.message.includes('did not initialize yet') || 
				    error.message.includes('prisma generate') ||
				    error.message.includes('has not been generated')) {
					errorMessage = "Prisma Client لم يتم توليده. يرجى تشغيل: npx prisma generate";
					errorCode = 'PRISMA_NOT_INITIALIZED';
				} else if (error.message.includes('P1001') || error.message.includes('connection')) {
					errorMessage = "لا يمكن الاتصال بقاعدة البيانات";
					errorCode = 'DATABASE_CONNECTION_ERROR';
				} else if (error.message.includes('table') || error.message.includes('does not exist')) {
					errorMessage = "جدول قاعدة البيانات غير موجود. يرجى تشغيل migrations";
					errorCode = 'TABLE_NOT_FOUND';
				} else if (error.message.includes('timeout')) {
					errorMessage = "انتهت مهلة الطلب. يرجى المحاولة مرة أخرى";
					errorCode = 'REQUEST_TIMEOUT';
				}
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
					{ error: "المادة مطلوبة", code: 'MISSING_SUBJECT' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (!title || typeof title !== 'string' || title.trim().length === 0) {
				const response = NextResponse.json(
					{ error: "العنوان مطلوب", code: 'MISSING_TITLE' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (!year || typeof year !== 'number' || year < 1900 || year > 2100) {
				const response = NextResponse.json(
					{ error: "السنة مطلوبة ويجب أن تكون بين 1900 و 2100", code: 'INVALID_YEAR' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			// Validate field lengths
			if (subject.trim().length > 200) {
				const response = NextResponse.json(
					{ error: "اسم المادة طويل جداً (الحد الأقصى 200 حرف)", code: 'SUBJECT_TOO_LONG' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			if (title.trim().length > 500) {
				const response = NextResponse.json(
					{ error: "العنوان طويل جداً (الحد الأقصى 500 حرف)", code: 'TITLE_TOO_LONG' },
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
						{ error: "تنسيق الرابط غير صحيح", code: 'INVALID_URL' },
						{ status: 400 }
					);
					return addSecurityHeaders(response);
				}
			}

			// Validate type
			if (!Object.values(ExamType).includes(type)) {
				const response = NextResponse.json(
					{ error: "نوع الامتحان غير صحيح", code: 'INVALID_TYPE' },
					{ status: 400 }
				);
				return addSecurityHeaders(response);
			}

			// إنشاء امتحان جديد مع timeout protection
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
				"حدث خطأ في إنشاء الامتحان"
			);
		}
	});
} 