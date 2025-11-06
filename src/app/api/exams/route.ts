import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { SubjectType, ExamType } from "@/types/settings";

export async function GET() {
	try {
		const exams = await prisma.exam.findMany({ orderBy: [{ year: "desc" }, { createdAt: "desc" }] });
		return NextResponse.json(exams);
	} catch (error) {
		// تسجيل الخطأ بشكل أكثر تفصيلاً في وضع التطوير
		if (process.env.NODE_ENV === 'development') {
			console.error("Error fetching exams:", error);
		}
		
		// تحديد رسالة الخطأ المناسبة
		let errorMessage = "حدث خطأ في جلب الامتحانات";
		let errorDetails = "Unknown error";
		
		if (error instanceof Error) {
			errorDetails = error.message;
			
			// رسائل خطأ أكثر وضوحاً للمشاكل الشائعة
			if (error.message.includes('did not initialize yet') || 
			    error.message.includes('prisma generate') ||
			    error.message.includes('has not been generated')) {
				errorMessage = "Prisma Client لم يتم توليده. يرجى تشغيل: npx prisma generate";
			} else if (error.message.includes('P1001') || error.message.includes('connection')) {
				errorMessage = "لا يمكن الاتصال بقاعدة البيانات";
			} else if (error.message.includes('table') || error.message.includes('does not exist')) {
				errorMessage = "جدول قاعدة البيانات غير موجود. يرجى تشغيل migrations";
			}
		}
		
		return NextResponse.json(
			{ 
				error: errorMessage, 
				details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
			},
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { subject, title, year, url, type = ExamType.OTHER } = await request.json();

		if (!subject || !title || !year) {
			return NextResponse.json(
				{ error: "البيانات المطلوبة غير مكتملة" },
				{ status: 400 }
			);
		}

		// إنشاء امتحان جديد
		const newExam = await prisma.exam.create({
			data: {
				subject,
				title,
				year,
				url: url || "",
				type
			}
		});

		return NextResponse.json({
			success: true,
			exam: newExam
		});
	} catch (error) {
		console.error("Error creating exam:", error);
		return NextResponse.json(
			{ error: "حدث خطأ في إنشاء الامتحان" },
			{ status: 500 }
		);
	}
} 