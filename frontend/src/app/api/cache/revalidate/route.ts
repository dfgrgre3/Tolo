import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isSameOriginRequest } from "@/lib/security/origin-check";
import { getBackendApiUrl } from "@/lib/api/backend-url";
import {
  ADMIN_PRIVILEGE_ROLES,
  normalizeRole,
} from "@/lib/auth/roles";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const ALLOW_PREFIX = [
  "/blog",
  "/courses",
  "/learning",
  "/announcements",
  "/exams",
  "/teacher-exams",
  "/library",
  "/events",
  "/contests",
  "/subscription",
  "/billing",
] as const;

function isAllowedRevalidatePath(p: string): boolean {
  if (p === "/") return true;
  return ALLOW_PREFIX.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

export async function POST(request: NextRequest) {
  // CSRF validation: strict Origin/Referer match against the canonical app
  // origin (protocol + hostname + port) — see lib/security/origin-check.ts.
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Invalid Origin/Referer (CSRF)" }, { status: 403 });
  }

  const cookieStore = await cookies();
  // NOTE: never trust client-writable identity cookies (`user_id`/`userId`)
  // as an auth pre-check — they are attacker-settable. The single source of
  // truth is the live backend session verified below via `access_token`.
  const accessToken = cookieStore.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let backendApiUrl: string;
  try {
    backendApiUrl = getBackendApiUrl('/auth/me');
  } catch (err) {
    logger.error("[cache/revalidate] backend URL not configured:", err);
    return NextResponse.json(
      { error: "Backend service unavailable" },
      { status: 503 }
    );
  }

  let me: Response;
  try {
    me = await fetch(backendApiUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return NextResponse.json(
      { error: "تعذر التحقق من الجلسة" },
      { status: 502 },
    );
  }
  if (!me.ok) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await me.json();
  } catch {
    return NextResponse.json({ error: "فشل التحقق من الجلسة" }, { status: 502 });
  }

  // Accept both bare `{ user }` and enveloped `{ data: { user } | user }`
  // shapes so a backend envelope change cannot silently lock out admins
  // (fail-closed only when no role is actually present).
  const record =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {};
  const dataRecord =
    typeof record.data === "object" && record.data !== null
      ? (record.data as Record<string, unknown>)
      : null;
  const userRecord =
    (typeof record.user === "object" && record.user !== null
      ? (record.user as Record<string, unknown>)
      : null) ??
    (dataRecord !== null &&
    typeof dataRecord.user === "object" &&
    dataRecord.user !== null
      ? (dataRecord.user as Record<string, unknown>)
      : null) ??
    dataRecord;
  const rawRole = userRecord?.role ?? record.role;
  const role = normalizeRole(rawRole);
  if (role === null || !ADMIN_PRIVILEGE_ROLES.includes(role)) {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const paths = body.paths;
  if (!Array.isArray(paths) || paths.length === 0 || paths.length > 50) {
    return NextResponse.json({ error: "paths مطلوب" }, { status: 400 });
  }

  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith("/") || p.length > 2048) {
      return NextResponse.json(
        { error: "كل مسار يجب أن يبدأ بـ /" },
        { status: 400 },
      );
    }
    if (!isAllowedRevalidatePath(p)) {
      return NextResponse.json(
        { error: `مسار غير مسموح لإبطال الكاش: ${p}` },
        { status: 400 },
      );
    }
  }

  for (const p of paths as string[]) {
    revalidatePath(p);
  }

  return NextResponse.json({ ok: true, revalidated: paths });
}
