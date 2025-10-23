import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { handleApiError, badRequestResponse, successResponse } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return badRequestResponse("email and password required", "MISSING_CREDENTIALS");
    }
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return badRequestResponse("Email already registered", "EMAIL_EXISTS");
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { email, passwordHash, name } });
    
    return successResponse({ id: user.id, email: user.email, name: user.name });
  } catch (error) {
    return handleApiError(error);
  }
}