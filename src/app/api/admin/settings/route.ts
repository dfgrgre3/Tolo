import { NextRequest, NextResponse } from "next/server";


import { logger } from '@/lib/logger';

// System settings stored in a key-value format
// We'll use a simple approach with a settings table or config file

interface SystemSettings {
  siteName: string;
  siteDescription: string;
  siteKeywords: string[];
  contactEmail: string;
  supportPhone: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
  };
  features: {
    registration: boolean;
    emailVerification: boolean;
    gamification: boolean;
    forum: boolean;
    blog: boolean;
    events: boolean;
    aiAssistant: boolean;
  };
  gamification: {
    xpPerTask: number;
    xpPerStudySession: number;
    xpPerExam: number;
    streakBonus: number;
  };
  limits: {
    maxUploadSize: number;
    maxStudySessionDuration: number;
    examTimeLimit: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
}

// Default settings
const defaultSettings: SystemSettings = {
  siteName: "منصة ثانوي",
  siteDescription: "منصة تعليمية متكاملة لطلاب الثانوية",
  siteKeywords: ["تعليم", "ثانوية", "امتحانات", "دراسة"],
  contactEmail: "support@thanawy.com",
  supportPhone: "",
  socialLinks: {},
  features: {
    registration: true,
    emailVerification: true,
    gamification: true,
    forum: true,
    blog: true,
    events: true,
    aiAssistant: true
  },
  gamification: {
    xpPerTask: 10,
    xpPerStudySession: 5,
    xpPerExam: 20,
    streakBonus: 2
  },
  limits: {
    maxUploadSize: 10,
    maxStudySessionDuration: 180,
    examTimeLimit: 60
  },
  maintenance: {
    enabled: false,
    message: "الموقع تحت الصيانة، يرجى المحاولة لاحقاً"
  }
};

// In-memory settings (in production, this should be stored in database)
let currentSettings: SystemSettings = { ...defaultSettings };

// GET /api/admin/settings - Get all settings
export async function GET() {
  try {
    return NextResponse.json({ settings: currentSettings });
  } catch (error) {
    logger.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء جلب الإعدادات" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/settings - Update settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Merge the new settings with existing ones
    currentSettings = {
      ...currentSettings,
      ...body,
      socialLinks: {
        ...currentSettings.socialLinks,
        ...(body.socialLinks || {})
      },
      features: {
        ...currentSettings.features,
        ...(body.features || {})
      },
      gamification: {
        ...currentSettings.gamification,
        ...(body.gamification || {})
      },
      limits: {
        ...currentSettings.limits,
        ...(body.limits || {})
      },
      maintenance: {
        ...currentSettings.maintenance,
        ...(body.maintenance || {})
      }
    };

    return NextResponse.json({ settings: currentSettings, success: true });
  } catch (error) {
    logger.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء تحديث الإعدادات" },
      { status: 500 }
    );
  }
}

// POST /api/admin/settings/reset - Reset to defaults
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.reset) {
      currentSettings = { ...defaultSettings };
      return NextResponse.json({ settings: currentSettings, success: true });
    }

    return NextResponse.json({ error: "إجراء غير معروف" }, { status: 400 });
  } catch (error) {
    logger.error("Error resetting settings:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء إعادة تعيين الإعدادات" },
      { status: 500 }
    );
  }
}