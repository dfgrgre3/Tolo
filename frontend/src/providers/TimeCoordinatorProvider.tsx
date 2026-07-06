'use client';

/**
 * TimeCoordinatorProvider
 *
 * A thin provider that mounts `useUnifiedTimeCoordinator` exactly once,
 * at a level that encompasses both the video player and the time-tracker dashboard.
 *
 * Mount this in the root layout or the shared layout that wraps both:
 *  - `/courses/[id]/lessons/[lessonId]` (video player)
 *  - `/time` (TimeTracker / Pomodoro)
 *
 * If these routes are under different layouts, mount it in the closest shared ancestor.
 *
 * @example In `app/(dashboard)/layout.tsx` or `app/layout.tsx`:
 * import { TimeCoordinatorProvider } from '@/providers/TimeCoordinatorProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <TimeCoordinatorProvider>
 *           {children}
 *         </TimeCoordinatorProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */

import { useUnifiedTimeCoordinator } from '@/hooks/use-unified-time-coordinator';

/**
 * TimeCoordinatorProvider
 *
 * A zero-overhead component (renders null) that mounts `useUnifiedTimeCoordinator` exactly once.
 * Mount it inside GlobalProviders alongside TimerBootstrap.
 *
 * It prevents double-counting of study time when:
 *  - A Pomodoro work session is running in TimeTracker
 *  - AND a video is playing in CourseVideoPlayer simultaneously
 */
export function TimeCoordinatorProvider() {
  useUnifiedTimeCoordinator();
  return null;
}

