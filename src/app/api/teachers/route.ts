import { NextRequest, NextResponse } from "next/server";
// Note: Teacher model is not in Prisma schema, so this endpoint is disabled
// To enable: Add Teacher model to prisma/schema.prisma

export async function GET() {
	// Teacher model not available in Prisma schema
	return NextResponse.json([], { status: 200 });
}

export async function POST(req: NextRequest) {
	// Teacher model not available in Prisma schema
	return NextResponse.json({ 
		error: "Teacher model is not available. Please add Teacher model to Prisma schema." 
	}, { status: 501 });
} 