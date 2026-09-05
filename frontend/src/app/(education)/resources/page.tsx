import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import ResourcesClient from "./resources-client";
import type { Resource } from "./resources-client";
import { apiClient } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: `المراجع والمصادر | ${SITE.name}`,
  description:
    "مكتبة المراجع والمصادر الدراسية لطلاب الثانوية العامة — مذكرات وملخصات معتمدة قابلة للمعاينة المباشرة أو التحميل المجاني.",
  keywords: [
    "مراجع ثانوية عامة",
    "مذكرات دراسية",
    "ملخصات ثانوية",
    "مصادر تعليمية",
    SITE.name,
  ],
  alternates: {
    canonical: "/resources",
  },
  openGraph: {
    title: `المراجع والمصادر | ${SITE.name}`,
    description:
      "مجموعة واسعة من المذكرات والملخصات الدراسية المعتمدة لطلاب الثانوية العامة.",
    type: "website",
    url: "/resources",
  },
};

// نستخدم apiClient بدلاً من fetch الخام لأنه على الخادم لا يوجد
// NEXT_PUBLIC_API_URL بمسار نسبي للمتصفح — apiClient يحوّل العنوان
// إلى العنوان المطلق للـ API الداخلي (INTERNAL_API_URL) تلقائياً.
// أي فشل هنا يُرجع undefined فتتكفل الواجهة بالجلب البديل من المتصفح.
async function fetchResources(): Promise<Resource[] | undefined> {
  try {
    const payload = await apiClient.get<any>("/resources");

    // نفس منطق التفريغ في الواجهة: الاستجابة إما مصفوفة مباشرة
    // أو مغلّفة بالشكل { success, data } (انظر response.Success في Go).
    const items = Array.isArray(payload) ? payload : payload?.data;
    if (!Array.isArray(items)) {
      logger.error("SSR: fetched resources is not an array:", payload);
      return undefined;
    }

    return items.map((item: any) => ({
      id: item.id ?? "",
      subject: item.subject ?? "",
      title: item.title ?? "",
      url: item.url ?? "",
      free: Boolean(item.free),
      type: item.type ?? "",
      source: item.source ?? null,
    }));
  } catch (error) {
    logger.error("SSR: failed to load resources:", error);
    return undefined;
  }
}

// قائمة الموارد تُجمَّع على الخادم حتى يصل HTML مكتاملاً لمحركات البحث
// ولتحسين LCP — معاينة الملفات وطلبات HEAD لأحجامها تبقى تفاعلية في المتصفح.
export default async function ResourcesPage() {
  const initialResources = await fetchResources();

  return <ResourcesClient initialResources={initialResources} />;
}
