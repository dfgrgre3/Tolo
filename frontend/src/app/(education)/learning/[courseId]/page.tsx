"use client";

import { useParams } from "next/navigation";

import { LearningHubView } from "./LearningHubView";

// Legacy entry point: /learning/<course-id> stays fully functional (existing
// bookmarks, the dashboard deep links and the video player's own navigation all
// still resolve here) while the canonical /courses/[slug]/learn/[lessonId] URL
// takes over as the public address. The id is resolved to the real slug by the
// edge canonicalization layer on the courses route.
export default function AdvancedLearningHub() {
  const params = useParams();
  return <LearningHubView courseId={params.courseId as string} />;
}
