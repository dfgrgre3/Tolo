import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SubjectType, ExamType } from "@/types/settings";
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

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
					return NextResponse.json(
						{ error: "حد غير صحيح. يجب أن يكون بين 1 و 100", code: 'INVALID_LIMIT' },
						{ status: 400 }
					);
				}
			}

			// Validate and parse offset
			let offset: number | undefined;
			if (offsetParam) {
				offset = parseInt(offsetParam, 10);
				if (isNaN(offset) || offset < 0) {
					return NextResponse.json(
						{ error: "إزاحة غير صحيحة. يجب أن تكون عدد صحيح موجب", code: 'INVALID_OFFSET' },
						{ status: 400 }
					);
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

			return NextResponse.json({
				exams,
				...(limit && { hasMore: exams.length === limit })
			});
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
			
			return NextResponse.json(
				{ 
					error: errorMessage,
					code: errorCode,
					...(process.env.NODE_ENV === 'development' && { details: errorDetails })
				},
				{ status: 500 }
			);
		}
	});
}

export async function POST(request: NextRequest) {
	return opsWrapper(request, async (req) => {
		try {
			// Parse request body with timeout protection
			let body;
			try {
				const bodyPromise = req.json();
				const timeoutPromise = new Promise<never>((resolve, reject) => {
					setTimeout(() => reject(new Error('Request body parsing timeout')), 5000);
				});
				body = await Promise.race([bodyPromise, timeoutPromise]);
			} catch (parseError) {
				return NextResponse.json(
					{ error: "تنسيق البيانات غير صحيح", code: 'PARSE_ERROR' },
					{ status: 400 }
				);
			}

			const { subject, title, year, url, type = ExamType.OTHER } = body;

			// Validate required fields
			if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
				return NextResponse.json(
					{ error: "المادة مطلوبة", code: 'MISSING_SUBJECT' },
					{ status: 400 }
				);
			}

			if (!title || typeof title !== 'string' || title.trim().length === 0) {
				return NextResponse.json(
					{ error: "العنوان مطلوب", code: 'MISSING_TITLE' },
					{ status: 400 }
				);
			}

			if (!year || typeof year !== 'number' || year < 1900 || year > 2100) {
				return NextResponse.json(
					{ error: "السنة مطلوبة ويجب أن تكون بين 1900 و 2100", code: 'INVALID_YEAR' },
					{ status: 400 }
				);
			}

			// Validate field lengths
			if (subject.trim().length > 200) {
				return NextResponse.json(
					{ error: "اسم المادة طويل جداً (الحد الأقصى 200 حرف)", code: 'SUBJECT_TOO_LONG' },
					{ status: 400 }
				);
			}

			if (title.trim().length > 500) {
				return NextResponse.json(
					{ error: "العنوان طويل جداً (الحد الأقصى 500 حرف)", code: 'TITLE_TOO_LONG' },
					{ status: 400 }
				);
			}

			// Validate URL format if provided
			if (url && typeof url === 'string' && url.trim().length > 0) {
				try {
					new URL(url.trim());
				} catch {
					return NextResponse.json(
						{ error: "تنسيق الرابط غير صحيح", code: 'INVALID_URL' },
						{ status: 400 }
					);
				}
			}

			// Validate type
			if (!Object.values(ExamType).includes(type)) {
				return NextResponse.json(
					{ error: "نوع الامتحان غير صحيح", code: 'INVALID_TYPE' },
					{ status: 400 }
				);
			}

			// إنشاء امتحان جديد مع timeout protection
			const createPromise = prisma.exam.create({
				data: {
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

			return NextResponse.json({
				success: true,
				exam: newExam
			}, { status: 201 });
		} catch (error) {
			logger.error("Error creating exam:", error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			const errorCode = error instanceof Error && error.message.includes('timeout') 
				? 'REQUEST_TIMEOUT' 
				: 'CREATE_ERROR';

			return NextResponse.json(
				{ 
					error: "حدث خطأ في إنشاء الامتحان",
					code: errorCode,
					...(process.env.NODE_ENV === 'development' && { details: errorMessage })
				},
				{ status: 500 }
			);
		}
	});
} 