import type { Metadata } from "next";
import { SITE } from "@thanawy/shared/site-config";
import TipsPage from "./tips-client";

export const metadata: Metadata = {
  title: `نصائح الدراسة والإتقان | ${SITE.name}`,
  description:
    "استراتيجيات مركّزة للتركيز والاستذكار والاستعداد للامتحانات — الاسترجاع النشط، التكرار المتباعد، ونصائح لكل مادة من الرياضيات للغات.",
  keywords: [
    "نصائح دراسة",
    "طرق المذاكرة",
    "الاسترجاع النشط",
    "التكرار المتباعد",
    "مهارات الامتحانات",
    SITE.name,
  ],
  alternates: {
    canonical: "/tips",
  },
  openGraph: {
    title: `نصائح الدراسة والإتقان | ${SITE.name}`,
    description:
      "استراتيجيات مركّزة للتركيز والاستذكار والاستعداد للامتحانات لكل مواد الثانوية العامة.",
    type: "website",
    url: "/tips",
  },
};

// صفحة نصائح ثابتة المحتوى — الـ metadata تُصدَّر من الخادم هنا بينما
// التفاعلية (framer-motion) تعيش في tips-client.
export default function TipsServerPage() {
  return <TipsPage />;
}
