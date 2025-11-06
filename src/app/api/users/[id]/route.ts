import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-unified";
import { prisma } from "@/lib/prisma";

// GET user by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Users can only view their own profile
    if (decodedToken.userId !== id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        grade: true,
        school: true,
        createdAt: true,
        emailVerified: true,
        phone: true,
        phoneVerified: true,
        provider: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "المستخدم غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "حدث خطأ في جلب بيانات المستخدم" },
      { status: 500 }
    );
  }
}

// PATCH update user profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Users can only update their own profile
    if (decodedToken.userId !== id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    const { name, email, bio, grade, school } = await request.json();

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(bio !== undefined && { bio }),
        ...(grade !== undefined && { grade }),
        ...(school !== undefined && { school })
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        bio: true,
        grade: true,
        school: true,
        createdAt: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "حدث خطأ في تحديث بيانات المستخدم" },
      { status: 500 }
    );
  }
}

// DELETE user account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Verify authentication
    const decodedToken = verifyToken(request);
    if (!decodedToken) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Users can only delete their own account
    if (decodedToken.userId !== id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete user account and all related data
    // Note: This will cascade delete related records based on Prisma schema
    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ 
      message: "تم حذف الحساب بنجاح" 
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "حدث خطأ في حذف الحساب" },
      { status: 500 }
    );
  }
}
