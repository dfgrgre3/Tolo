import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TokenService } from "@/services/auth/token-service";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("access_token")?.value;

    if (!currentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await TokenService.verifyToken<any>(currentToken);
    if (!payload || payload.role !== "ADMIN" || payload.originalAdminId) {
      return NextResponse.json({ error: "Unauthorized or already impersonating" }, { status: 403 });
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: "Target User ID is required" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate new token with impersonation info
    const newToken = await TokenService.generateAccessToken({
      userId: targetUser.id,
      role: targetUser.role,
      sessionId: payload.sessionId,
      originalAdminId: payload.userId, // Store the real admin ID
    });

    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("access_token", newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.set("is_impersonating", "true", {
      httpOnly: false, // Accessible by client to show banner
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Impersonation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const currentToken = cookieStore.get("access_token")?.value;

    if (!currentToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = await TokenService.verifyToken<any>(currentToken);
    if (!payload || !payload.originalAdminId) {
      return NextResponse.json({ error: "Not currently impersonating" }, { status: 400 });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: payload.originalAdminId },
      select: { id: true, role: true },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Admin user not found" }, { status: 404 });
    }

    // Restore admin identity
    const newToken = await TokenService.generateAccessToken({
      userId: adminUser.id,
      role: adminUser.role,
      sessionId: payload.sessionId,
    });

    const isProduction = process.env.NODE_ENV === "production";

    cookieStore.set("access_token", newToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    cookieStore.delete("is_impersonating");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Stop impersonation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
