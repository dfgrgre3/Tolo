import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import TeachersPage from "./teachers-client";
import type { Teacher } from "./teachers-client";

export const metadata: Metadata = {
  title: `المعلمون | ${SITE.name}`,
  description:
    "تعرّف على نخبة معلمي المرحلة الثانوية — خبراء كل مادة، وسجّل حصصك الواقعية وادمجها في خطتك الدراسية.",
  keywords: ["معلمون", "أساتذة ثانوي", "مدرسون خاصون", SITE.name],
  alternates: {
    canonical: "/teachers",
  },
  openGraph: {
    title: `المعلمون | ${SITE.name}`,
    description:
      "نخبة معلمي المرحلة الثانوية — خبراء كل مادة مع جدولة الحصص الواقعية.",
    type: "website",
    url: "/teachers",
  },
};

// قائمة المعلمين عامة فتُجمَّع على الخادم لمحركات البحث وLCP —
// الحصص والجدول الخاصان بالمستخدم يُجلبان في المتصفح كالمعتاد.
async function getTeachers(): Promise<Teacher[] | undefined> {
  try {
    return await apiClient.get<Teacher[]>("/teachers");
  } catch (err) {
    logger.error("SSR: failed to load teachers", err);
    return undefined; // المتصفح سيعيد المحاولة عبر المكوّن التفاعلي
  }
}

export default async function TeachersServerPage() {
  const teachers = await getTeachers();
  return <TeachersPage initialTeachers={teachers} />;
}
