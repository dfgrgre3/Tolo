import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SITE } from "@thanawy/shared/site-config";
import { getCourseDetailHydration } from "@/lib/course/course-domain-service";
import { ApiError } from "@/lib/api/api-client";
import { logger } from "@/lib/logger";
import { LearningHubView } from "@/app/(education)/learning/[courseId]/LearningHubView";

interface Props {
  params: Promise<{ slug: string; lessonId: string }>;
}

// The lesson page is a distinct route from the course page on purpose: the
// course page is the marketing/enrollment surface and must never be the video
// player, while this route carries the player and the lesson tools. The slug is
// resolved to the course id server-side — the hub's data layer (enrollment,
// progress, notes) is keyed by id — so the id never appears in the URL.
async function resolveCourse(slug: string) {
  try {
    const hydration = await getCourseDetailHydration(slug);
    const subject = hydration.subject;
    if (!subject || !subject.id) return null;
    return subject;
  } catch (error) {
    // A 404 from the backend means the course is unknown or not public: render
    // the real 404 rather than leaking that the course exists.
    if (!(error instanceof ApiError && error.status === 404)) {
      logger.error("Error resolving course for lesson route:", error);
    }
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const subject = await resolveCourse(slug);

  if (!subject) {
    return {
      title: `درس غير موجود | ${SITE.name}`,
      description: "الدرس المطلوب غير متوفر حالياً."
    };
  }

  const title = `${subject.nameAr || subject.name} - الدرس | ${SITE.name}`;
  const description =
    subject.description || `درس من كورس ${subject.nameAr || subject.name} على منصة ${SITE.name}.`;

  return {
    title,
    description,
    alternates: { canonical: `/courses/${slug}` },
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description }
  };
}

export default async function LearnLessonPage({ params }: Props) {
  const { slug, lessonId } = await params;

  const subject = await resolveCourse(slug);
  if (!subject) {
    notFound();
  }

  // The hub enrolls the caller client-side against this id; a visitor who is not
  // enrolled is redirected to the course page by the hub itself.
  return (
    <LearningHubView
      courseId={subject.id}
      courseSlug={subject.slug ?? slug}
      initialLessonId={lessonId}
    />
  );
}
