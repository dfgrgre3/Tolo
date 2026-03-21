import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PasswordService } from "@/lib/auth/password-service";

// POST /api/admin/setup - Create admin user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, username, password, secretKey } = body;

    // Verify secret key to prevent unauthorized admin creation
    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "tolo-admin-2026";

    if (secretKey !== adminSecretKey) {
      return NextResponse.json(
        { error: "مفتاح الأمان غير صحيح" },
        { status: 403 }
      );
    }

    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "يوجد مستخدم Admin بالفعل", admin: { email: existingAdmin.email } },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "البريد الإلكتروني وكلمة المرور مطلوبان" },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // Update existing user to admin
      const hashedPassword = await PasswordService.hash(password);
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: "ADMIN",
          passwordHash: hashedPassword,
          emailVerified: true,
          name: name || existingUser.name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
      return NextResponse.json({
        message: "تم ترقية المستخدم إلى Admin بنجاح",
        user: updatedUser,
      });
    }

    // Hash password
    const hashedPassword = await PasswordService.hash(password);

    // Create new admin user
    const admin = await prisma.user.create({
      data: {
        name: name || "Admin",
        email,
        username: username || "admin",
        passwordHash: hashedPassword,
        role: "ADMIN",
        emailVerified: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      message: "تم إنشاء مستخدم Admin بنجاح",
      user: admin,
    });
  } catch (error) {
    console.error("Error creating admin:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إنشاء مستخدم Admin" },
      { status: 500 }
    );
  }
}
