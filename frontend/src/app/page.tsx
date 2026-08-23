import { cookies } from "next/headers";
import HomePage from "@/app/components/home/HomePage";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "منصة ثنائي التعليمية | تعلّم المهارات الأكثر طلباً",
  description: "منصة تعليمية عربية متكاملة تمنحك فرصة التعلم على يد الخبراء والمدربين، مع شهادات وتطبيقات عملية. اكتشف آلاف الكورسات المجانية والمدفوعة.",
  keywords: [
    "منصة تعليمية",
    "دورات تدريبية",
    "تعليم إلكتروني",
    "كورسات مجانية",
    "شهادات معتمدة",
    "معلمون مؤهلون",
    "تعلم مهارات جديدة",
    "تطوير الذات",
    "تعليم عربي",
    "online courses"
  ],
  authors: [{ name: "منصة ثنائي" }],
  openGraph: {
    title: "منصة ثنائي التعليمية | تعلّم المهارات الأكثر طلباً",
    description: "منصة تعليمية عربية متكاملة لتعلم المهارات الحديثة على يد خبراء ومدربين مؤهلين.",
    type: "website",
    locale: "ar_EG",
    url: "https://tanthawy.com",
    images: [
      {
        url: "https://tanthawy.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "منصة ثنائي التعليمية",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "منصة ثنائي التعليمية | تعلّم المهارات الأكثر طلباً",
    description: "منصة تعليمية عربية متكاملة لتعلم المهارات الحديثة على يد خبراء ومدربين مؤهلين.",
  },
};

export default async function Home() {
  // تلميح وجود جلسة يُقرأ على السيرفر، ليعرض العميل الواجهة الصحيحة من أول رسم.
  const cookieStore = await cookies();
  const hasSession = Boolean(
    cookieStore.get("access_token")?.value || cookieStore.get("refresh_token")?.value
  );

  return <HomePage hasSession={hasSession} />;
}
