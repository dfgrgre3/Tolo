import type { Metadata } from "next";
import CourseDetailClient from "./CourseDetailClient";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://backend-gamma-lyart-16.vercel.app/api";

  try {
    const res = await fetch(`${apiUrl}/courses/${id}`, {
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!res.ok) {
      return {
        title: "كورس غير موجود | Tolo",
        description: "تفاصيل الدورة التعليمية المطلوبة غير متوفرة حالياً."
      };
    }

    const courseData = await res.json();
    const subject = courseData?.subject;

    if (!subject) {
      return {
        title: "كورس غير موجود | Tolo",
        description: "تفاصيل الدورة التعليمية المطلوبة غير متوفرة حالياً."
      };
    }

    const title = `${subject.nameAr || subject.name} - كورس تفاعلي | Tolo`;
    const description = subject.description || "ابدأ في تعلم هذا الكورس التفاعلي على منصة Tolo التعليمية.";
    const imageUrl = subject.thumbnailUrl || "/favicon.svg";

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 600,
            alt: subject.nameAr || subject.name,
          }
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [imageUrl],
      }
    };
  } catch (error) {
    console.error("Error generating dynamic metadata:", error);
    return {
      title: "تفاصيل الكورس | Tolo",
      description: "منصة Tolo التعليمية للثانوية العامة"
    };
  }
}

export default function Page() {
  return <CourseDetailClient />;
}
