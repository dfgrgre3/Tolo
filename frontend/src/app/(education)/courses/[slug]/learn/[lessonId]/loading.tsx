import { LearningHubLoading } from "@/app/(education)/learning/[courseId]/components/LearningHubStates";

// Streaming fallback while the course slug is resolved server-side. The hub has
// its own loading state too, so this only covers the server fetch.
export default function Loading() {
  return <LearningHubLoading />;
}
