import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

const BACKEND_URL = (process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8082').replace(/\/api$/, '').replace(/\/+$/, '');

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
  const cookie = request.headers.get("cookie") || "";
  const me = await fetch(`${BACKEND_URL}/api/auth/me`, {
    headers: { Cookie: cookie },
    cache: "no-store",
  });
  if (!me.ok) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  let payload: { user?: { role?: string } };
  try {
    payload = await me.json();
  } catch {
    return NextResponse.json({ error: "فشل التحقق من الجلسة" }, { status: 502 });
  }

  const role = payload.user?.role;
  if (role !== "ADMIN" && role !== "MODERATOR") {
    return NextResponse.json({ error: "ممنوع" }, { status: 403 });
  }

  let body: { paths?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "جسم الطلب غير صالح" }, { status: 400 });
  }

  const paths = body.paths;
  if (!Array.isArray(paths) || paths.length === 0) {
    return NextResponse.json({ error: "paths مطلوب" }, { status: 400 });
  }

  for (const p of paths) {
    if (typeof p !== "string" || !p.startsWith("/")) {
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
