# P013 — Backend authorization audit

## Contract provenance

The frontend contract is generated from the Swagger document currently present
in the sibling backend worktree:

| Item | Value |
| --- | --- |
| Backend repository | `thanawy/backend` (`D:\backend`) |
| Backend contract commit | `66644f266b30bc7b8dfc96f3d45bda9be2195ae7` |
| Commit message | `chore(api): pin generated swagger contract` |
| Backend Swagger SHA-256 | `8946C6FF18EFE67B9AF9E37A2E63D75C272793475B75FE7AF0BFBC536D8C3111` |
| Converted frontend contract SHA-256 | `31F218F364D6B9CB10A6D205FE8E95CE3D88AE1A813F392324E0B9DACA8BB019` |

The converted backend Swagger at the contract commit matches
`packages/contracts/swagger.json` byte-for-byte. However, `D:\backend` has
other unrelated uncommitted changes, but the three generated contract files
are clean and pinned by the commit above.

## Authorization audit status

| Domain | Server-side boundary found | Current evidence | Status |
| --- | --- | --- | --- |
| Course | Admin/teacher route guards; course handlers perform ownership checks where applicable | `hexagonal_routes.go`, `course_*_handler.go` | Partial: route and handler review; integration coverage needed |
| Enrollment | Authenticated user is used for self-service eligibility/status; admin enrollment is under admin routes | `protected_routes.go`, `course_enrollment_eligibility.go`, `admin_routes_users.go` | Partial: add cross-user IDOR tests |
| Progress | Progress queries are scoped by authenticated user and course enrollment | `subject_progress.go`, `course_quiz_handlers.go` | Partial: handler tests needed for foreign user/course |
| Quiz | Enrollment/access checks and attempt ownership are present | `course_quiz_handlers.go`, `exam_handler_submit.go` | Partial: existing unit coverage does not prove every route |
| Payments | Payment creation/history use authenticated user; purchase handlers use user-scoped transactions | `payment_handler_create.go`, `payment_handler_addons.go` | Partial: add cross-user payment and replay tests |
| Teaching | Teacher routes use `TeacherRequired`; course/student/review handlers check instructor ownership | `protected_routes.go`, `teaching_*_handler*.go` | Partial: add non-owner teacher tests |
| Admin | `Auth`, `AdminOrModerator`, `StrictRBAC`, and `AdminAPIPermissionRequired` are layered | `admin_routes.go`, `auth_guards.go` | Middleware tests exist; route matrix coverage should be expanded |
| Storage | Protected upload routes are behind authenticated user routes; admin upload permissions are deny-by-default | `protected_routes.go`, `auth_guards.go`, storage handlers | Partial: add owner/bucket traversal tests |

## Blocking rule

Privileged changes are not considered merge-ready until:

1. the frontend contract points to the committed backend Swagger provenance
   above;
2. backend tests cover unauthenticated access, wrong-role access, and
   cross-user/resource ownership for the affected domain; and
3. the backend authorization test job passes in CI.

The backend CI already runs `go test -race -coverprofile=coverage.out ./...`.
The remaining work is to add the domain-specific negative authorization cases
listed above; the Swagger provenance blocker is resolved.

The first blocking matrix is now implemented in
`D:\backend\internal\infrastructure\api\middleware\authorization_matrix_test.go`.
It covers authenticated access for enrollment/progress/payments, teacher and
student role boundaries for teaching/quizzes, and deny-by-default admin and
storage permissions. These tests run as part of the backend's existing
`go test ./...` CI gate.

An ownership regression test was also added to
`D:\backend\internal\infrastructure\api\handlers\protected\course_quiz_handlers_test.go`:
an enrolled student, the course instructor, and an admin are allowed, while a
different student is rejected for the same course.

Additional handler-level ownership tests now cover:

- non-owner teachers cannot list a course's students;
- payment history is filtered by the authenticated user;
- managed storage keys cannot be deleted with view-only permissions.
- lesson progress is not exposed across authenticated users.

These tests are in
`D:\backend\internal\infrastructure\api\handlers\protected\authorization_ownership_test.go`.
