/**
 * بيانات الموقع المركزية - مصدر الحقيقة الوحيد
 * يُسخدم في Frontend و Backend
 */

export const SITE = {
  name: "TOLO",
  nameAr: "تولو",
  tagline: "المستقبل يبدأ هنا",
  taglineEn: "THE REALM OF KNOWLEDGE",
  description: "منصة تعليمية تفاعلية للثانوية العامة - كورسات، امتحانات، ومدرسين",
  descriptionShort: "منصة تعليمية لإدارة التعلم والمحتوى.",
  url: "https://tolo.app",
  logo: "/logo-tolo.jpg",
  favicon: "/favicon.svg",
  locale: "ar_AR",
  dir: "rtl" as const,
  lang: "ar",
} as const;

export const CONTACT = {
  email: "support@tolo.app",
  adminEmail: "admin@tolo.app",
  phone: "+20 1000 000 000",
  phoneTel: "+201000000000",
  dpoEmail: "dpo@tolo.app",
} as const;

export const SOCIAL = {
  facebook: "",
  twitter: "",
  instagram: "",
  youtube: "",
  github: "",
  linkedin: "",
} as const;

export const LEGAL = {
  companyNameAr: "منصة ثانوية أونلاين",
  companyNameEn: "Thanawy Online Educational Platform",
  taxId: "٣١٢-٤٥٦-٧٨٩",
  commercialReg: "١٢٣٤٥٦٧٨٩٠",
  verificationBaseUrl: "https://thanawy.online/verify",
} as const;

export const SEO_KEYWORDS = ["education", "tolo", "thanawy", "تعليم", "ثانوية"] as const;

export const DEFAULT_FEATURES = {
  registration: true,
  engagement: true,
  forum: true,
  blog: true,
  events: true,
  aiAssistant: true,
  emailVerification: true,
} as const;

export const DEFAULT_SYSTEM_SETTINGS = {
  siteName: SITE.name,
  siteDescription: SITE.descriptionShort,
  features: { ...DEFAULT_FEATURES },
  maintenance: {
    enabled: false,
    message: "",
  },
} as const;

export const DEFAULT_ADMIN_SETTINGS = {
  siteName: SITE.name,
  siteDescription: SITE.descriptionShort,
  siteKeywords: SEO_KEYWORDS as unknown as string[],
  contactEmail: CONTACT.adminEmail,
  supportPhone: CONTACT.phone,
  socialLinks: { ...SOCIAL },
  features: {
    ...DEFAULT_FEATURES,
  },
  engagement: {
    pointsPerTask: 10,
    pointsPerStudySession: 5,
    pointsPerExam: 20,
    streakBonus: 2,
  },
  limits: {
    maxUploadSize: 10,
    maxStudySessionDuration: 180,
    examTimeLimit: 60,
  },
  maintenance: {
    enabled: false,
    message: "",
  },
} as const;

export const APP_VERSION = "4.0.0-RPG";