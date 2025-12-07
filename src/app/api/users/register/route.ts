import { NextRequest, NextResponse } from "next/server";
import { prisma } from '@/lib/db';
import bcrypt from "bcryptjs";
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";
import { opsWrapper } from "@/lib/middleware/ops-middleware";

export async function POST(req: NextRequest) {
	return opsWrapper(req, async (request) => {
		try {
			let body;
			try {
				body = await request.json();
			} catch (error) {
				return badRequestResponse('Invalid JSON body', 'INVALID_JSON');
			}

			const { email, password, name } = body;

			if (!email || !password) {
				return badRequestResponse('Email and password are required', 'MISSING_CREDENTIALS');
			}

			const existing = await prisma.user.findUnique({ where: { email } });
			if (existing) {
				return NextResponse.json(
					{
						error: 'Email already registered',
						code: 'USER_EXISTS',
						status: 409
					},
					{ status: 409 }
				);
			}

			const passwordHash = await bcrypt.hash(password, 10);
			const user = await prisma.user.create({ data: { email, passwordHash, name } });

			return successResponse(
				{ id: user.id, email: user.email, name: user.name },
				'User registered successfully',
				201
			);
		} catch (error) {
			return handleApiError(error);
		}
	});
} 