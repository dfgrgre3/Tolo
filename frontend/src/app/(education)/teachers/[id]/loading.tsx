import { TeacherProfileSkeleton } from "./teacher-profile-client";

// Instant skeleton on client-side navigation to /teachers/[id] — the
// streamed page content replaces it as soon as the SSR chunks arrive.
export default function TeacherProfileLoading() {
  return <TeacherProfileSkeleton />;
}
