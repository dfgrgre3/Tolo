import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma, SubjectType, ExamType } from "@prisma/client";

export async function GET() {
	const exams = await prisma.exam.findMany({ orderBy: [{ year: "desc" }, { createdAt: "desc" }] });
	return NextResponse.json(exams);
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