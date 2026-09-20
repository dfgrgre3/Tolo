import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import { SITE } from "@thanawy/shared/site-config";
import { ApiError } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import { toSafeJsonLd } from "@/lib/security/json-ld";
import {
  getTeacherPublicProfile,
  getTeacherPublicCourses,
  type TeacherPublicProfile,
  type TeacherPublicCourse,
} from "@/lib/teacher/teacher-service";
import TeacherProfileClient, { TeacherProfileSkeleton } from "./teacher-profile-client";

interface Props {
  params: Promise<{ id: string }>;
}

// Metadata must never hold the first byte hostage: if the backend takes
// longer than a few seconds (cold start / pool warmup), fall back to a
// generic title and let the streamed body carry the real content.
const METADATA_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const profile = await withTimeout(getTeacherPublicProfile(id), METADATA_TIMEOUT_MS);
    if (!profile) return fallbackMetadata();
    const title = `${profile.name} — ${profile.headline} | ${SITE.name}`;
    const description =
      profile.bio?.slice(0, 160) ||
      `تعرّف على ${profile.name} — ${profile.headline} على منصة ${SITE.name}. استكشف الكورسات والتقييمات.`;
    const url = `/teachers/${profile.id}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        type: "profile",
        url,
        ...(profile.avatar ? { images: [{ url: profile.avatar, alt: profile.name }] } : {}),
      },
      twitter: { card: "summary", title, description },
    };
  } catch {
    return fallbackMetadata();
  }
}

function fallbackMetadata(): Metadata {
  return {
    title: `الملف الشخصي للمدرس | ${SITE.name}`,
    description: `تعرّف على مدرسي منصة ${SITE.name} — الكورسات والتقييمات.`,
  };
}

// The page shell streams immediately; the data-dependent body resolves
// inside Suspense so the user sees the skeleton (or loading.tsx on
// navigation) instead of a blank wait for the full SSR.
export default async function TeacherProfilePage({ params }: Props) {
  const { id } = await params;
  return (
    <Suspense fallback={<TeacherProfileSkeleton />}>
      <TeacherProfileLoader teacherId={id} />
    </Suspense>
  );
}

async function TeacherProfileLoader({ teacherId }: { teacherId: string }) {
  let profile: TeacherPublicProfile | null = null;
  let initialCourses: TeacherPublicCourse[] = [];
  let coursesTotal = 0;

  try {
    const [p, courses] = await Promise.all([
      getTeacherPublicProfile(teacherId),
      getTeacherPublicCourses(teacherId, { page: 1, limit: 9 }).catch(() => null),
    ]);
    profile = p;
    if (courses) {
      initialCourses = courses.items ?? [];
      coursesTotal = courses.pagination?.total ?? 0;
    }
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) {
      logger.error("Error loading teacher profile:", error);
    }
  }

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <div className="space-y-4 text-center">
          <ChevronLeft className="mx-auto h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">
            لم يتم العثور على هذا المدرس
          </h2>
          <p className="text-sm text-gray-500">
            ربما تم إيقاف الحساب أو أن الرابط غير صحيح.
          </p>
          <Link
            href="/teachers"
            className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 font-bold text-white"
          >
            العودة إلى دليل المدرسين
          </Link>
        </div>
      </div>
    );
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    description: profile.bio || profile.headline,
    ...(profile.avatar ? { image: profile.avatar } : {}),
    jobTitle: profile.headline,
    ...(profile.stats.ratingAvg > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: profile.stats.ratingAvg,
            reviewCount: profile.stats.reviewsCount,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toSafeJsonLd(schema) }}
      />
      <TeacherProfileClient
        profile={profile}
        initialCourses={initialCourses}
        coursesTotal={coursesTotal}
      />
    </>
  );
}
