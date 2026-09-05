import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import CoursesClient from "./courses-client";
import { fetchCoursesCatalog } from "./catalog-data";

export const metadata: Metadata = {
  title: `الدورات التعليمية | ${SITE.name}`,
  description:
    "تصفّح جميع دورات المرحلة الثانوية — رياضيات، فيزياء، كيمياء، أحياء، لغات والمزيد. مشغل فيديو متطور، ملاحظات، واختبارات لكل دورة.",
  keywords: [
    "دورات ثانوية عامة",
    "كورسات ثانوي",
    "دورات تعليمية",
    "مراجعات نهائية",
    SITE.name,
  ],
  alternates: {
    canonical: "/courses",
  },
  openGraph: {
    title: `الدورات التعليمية | ${SITE.name}`,
    description:
      "تصفّح جميع دورات المرحلة الثانوية مع مشغل فيديو متطور وملاحظات واختبارات.",
    type: "website",
    url: "/courses",
  },
};

// كتالوج الدورات يُجمَّع على الخادم حتى يصل HTML مكتاملاً لمحركات البحث
// ولتحسين LCP — التصفية والبحث يبقيان تفاعليين في المتصفح.
export default async function CoursesPage() {
  const { courses, categories } = await fetchCoursesCatalog();

  return (
    <CoursesClient
      initialCourses={courses}
      initialCategories={categories}
    />
  );
}
