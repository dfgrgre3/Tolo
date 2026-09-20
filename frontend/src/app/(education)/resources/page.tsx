import { SITE } from "@thanawy/shared/site-config";
import ResourcesClient from "./resources-client";
import type { Resource } from "./resources-client";
import { fetchResourcesRaw } from "@/features/courses/api/courses-gateway";
import { logger } from "@/lib/logger";

export const metadata = {
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

// النقل عبر بوابة الكورسات (transport boundary) — أي فشل هنا يُرجع
// undefined فتتكفل الواجهة بالجلب البديل من المتصفح.
async function fetchResources(): Promise<Resource[] | undefined> {
  try {
    const payload = await fetchResourcesRaw();

    // نفس منطق التفريغ في الواجهة: الاستجابة إما مصفوفة مباشرة
    // أو مغلّفة بالشكل { success, data } (انظر response.Success في Go).
    const items = Array.isArray(payload)
      ? payload
      : isResourceEnvelope(payload)
        ? payload.data
        : undefined;
    if (!Array.isArray(items)) {
      logger.error("SSR: fetched resources is not an array:", payload);
      return undefined;
    }

    return items.map((item: unknown) => {
      const resource = isRecord(item) ? item : {};
      return {
        id: stringValue(resource.id),
        subject: stringValue(resource.subject),
        title: stringValue(resource.title),
        url: stringValue(resource.url),
        free: Boolean(resource.free),
        type: stringValue(resource.type),
        source: resource.source == null ? null : stringValue(resource.source),
      };
    });
  } catch (error) {
    logger.error("SSR: failed to load resources:", error);
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isResourceEnvelope(value: unknown): value is { data: unknown[] } {
  return isRecord(value) && Array.isArray(value.data);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

// قائمة الموارد تُجمَّع على الخادم حتى يصل HTML مكتاملاً لمحركات البحث
// ولتحسين LCP — معاينة الملفات وطلبات HEAD لأحجامها تبقى تفاعلية في المتصفح.
export default async function ResourcesPage() {
  const initialResources = await fetchResources();

  return <ResourcesClient initialResources={initialResources} />;
}
