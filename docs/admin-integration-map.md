# Admin Integration Map

This map tracks how each admin surface connects to the Go API and which public routes must reflect admin changes.

| Admin page | Go API | CRUD coverage | Public routes to revalidate/check |
| --- | --- | --- | --- |
| `/admin` | `GET /api/admin/dashboard` | read | `/` |
| `/admin/users` | `GET/POST/PATCH/DELETE /api/admin/users` | list/create/update/delete | dashboard/profile dependent views |
| `/admin/users/[id]` | `GET/PATCH/DELETE /api/admin/users/:id` | read/update/delete | dashboard/profile dependent views |
| `/admin/users/[id]/permissions` | `GET /api/admin/users/:id`, `PATCH /api/admin/users` | read/update | admin gates and role-protected UI |
| `/admin/teachers` | `GET/POST/PATCH/DELETE /api/admin/teachers` | list/create/update/delete | `/teachers`, course instructor displays |
| `/admin/subjects` | `GET/POST/PATCH/DELETE /api/admin/subjects` | list/create/update/delete | `/courses`, `/courses/[id]` |
| `/admin/course-categories` | `GET/POST/PATCH/DELETE /api/admin/course-categories` | list/create/update/delete | `/courses` |
| `/admin/courses` | `GET/POST/PATCH/DELETE /api/admin/courses` | list/create/update/delete | `/courses`, `/courses/[id]`, `/learning/[courseId]` |
| `/admin/courses/[id]` | `GET /api/admin/courses/:id` | read | `/courses/[id]`, `/learning/[courseId]` |
| `/admin/courses/[id]/curriculum` | `GET/PATCH/PUT /api/admin/courses/:id/curriculum` | read/update | `/learning/[courseId]` |
| `/admin/courses/[id]/students` | `GET/POST/DELETE /api/admin/courses/:id/enrollments` | list/enroll/unenroll | student dashboard, `/learning/[courseId]` |
| `/admin/exams` | `GET/POST/PATCH/DELETE /api/admin/exams`, `POST /api/admin/exams/bulk` | list/create/update/delete/bulk | `/exams`, `/teacher-exams` |
| `/admin/books` | `GET/POST/PATCH/DELETE /api/admin/books` | list/create/update/delete | `/library` |
| `/admin/blog` | `GET/POST/PATCH/DELETE /api/admin/blog` | list/create/update/delete | `/blog`, `/blog/[slug]` |
| `/admin/announcements` | `GET/POST/PATCH/DELETE /api/admin/announcements` | list/create/update/delete | `/announcements` |
| `/admin/notifications` | `GET /api/admin/broadcasts`, notification broadcast endpoints | list/cancel/retry/send | `/notifications`, headers, realtime panels |
| `/admin/events` | `GET/POST/PATCH/DELETE /api/admin/events` | list/create/update/delete | `/events`, `/events/[id]` |
| `/admin/contests` | `GET/POST/PATCH/DELETE /api/admin/contests` | list/create/update/delete | `/contests` |
| `/admin/coupons` | `GET/POST/PATCH/DELETE /api/admin/coupons` | list/create/update/delete | checkout, `/subscription`, `/billing` |
| `/admin/payments` | `GET /api/admin/payments` | read | `/billing`, `/subscription/success`, `/subscription/fail` |
| `/admin/revenue` | `GET /api/admin/analytics/revenue` | read | admin-only |
| `/admin/analytics` | `GET /api/admin/analytics`, journey endpoints | read/track/export | admin-only |
| `/admin/marketing` | `GET/POST/PATCH/DELETE /api/admin/marketing/campaigns` | list/create/update/delete | notifications, user engagement surfaces |
| `/admin/ab-testing` | `GET/POST/PATCH/DELETE /api/admin/ab-testing` | list/create/update/delete | tested public surfaces |
| `/admin/achievements` | `GET/POST/PATCH/DELETE /api/admin/achievements` | list/create/update/delete | `/achievements`, gamification widgets |
| `/admin/rewards` | `GET/POST/PATCH/DELETE /api/admin/rewards` | list/create/update/delete | gamification/rewards widgets |
| `/admin/seasons` | `GET/POST/PATCH/DELETE /api/admin/seasons` | list/create/update/delete | gamification widgets |
| `/admin/challenges` | `GET/POST/PATCH/DELETE /api/admin/challenges` | list/create/update/delete | dashboard challenges/tasks |
| `/admin/forum` | `GET /api/admin/forum`, forum category endpoints | list/moderate/create category | `/forum` |
| `/admin/resources` | `ANY /api/admin/resources` | collection CRUD | `/resources`, course resource panels |
| `/admin/reports` | custom report endpoints | list/create/update/delete/execute/export | admin-only |
| `/admin/reports/content` | `ANY /api/admin/reports/content` | moderation workflow | content pages |
| `/admin/tickets` | support ticket endpoints | list/create/message/status/priority/assign/tags/close | user support center |
| `/admin/backups` | backup endpoints | list/create/restore/delete/verify/download/schedule | admin-only |
| `/admin/audit-logs` | `GET /api/admin/audit-logs` | read | admin-only |
| `/admin/settings` | `GET/PATCH /api/admin/settings` | read/update | global layout, branding, maintenance mode |
| `/admin/infrastructure` | `GET /api/admin/infrastructure/stats` | read | admin-only |
| `/admin/live` | `GET /api/admin/live` | read/revoke sessions | admin-only |
| `/admin/automations` | `GET/POST/PATCH/DELETE /api/admin/automations` | list/create/update/delete | scheduler/notifications dependent |

## Required Test Pass

For every CRUD row:

1. List loads with auth cookie and bearer fallback through `adminFetch/adminApi`.
2. Create validates payload and returns a normalized `{ data, message }` response.
3. Update persists and refreshes the admin query.
4. Delete/close/archive removes or hides the item safely.
5. Public routes listed above are revalidated or otherwise refreshed.
6. UI action buttons are hidden unless the user has the matching `*:manage` permission.

