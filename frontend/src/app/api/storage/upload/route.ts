import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateUserPath, validateFileType, validateFileSize, formatFileSize } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import { SERVER_MAX_FILE_SIZE, SERVER_ALLOWED_TYPES, sanitizeFolder } from "@/lib/storage/upload-policy";

// ─── Auth ───────────────────────────────────────────────────────────────────
/**
 * Resolves the authenticated user via Supabase JWT verification.
 * SECURITY: We intentionally do NOT read userId from a plain cookie
 * (e.g. "user_id") because unsigned cookies can be freely modified by
 * the client. supabase.auth.getUser() validates the signed JWT and is
 * the only trustworthy source of the caller's identity.
 */
async function getAuthenticatedUserId(): Promise<{ userId: string; supabase: Awaited<ReturnType<typeof createClient>> } | null> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user || error) return null;
  return { userId: user.id, supabase };
}

// ─── CSRF helper ────────────────────────────────────────────────────────────
// Strict Origin/Referer hostname matching against the request host.
function isSameOriginRequest(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host") || "";
  const expectedHost = host.split(":")[0];

  if (origin) {
    try {
      return new URL(origin).hostname === expectedHost;
    } catch {
      return false;
    }
  }
  if (referer) {
    try {
      return new URL(referer).hostname === expectedHost;
    } catch {
      return false;
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, supabase } = auth;

    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Invalid Origin/Referer (CSRF)" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = sanitizeFolder((formData.get("folder") as string) || "uploads");
    // Client-declared restrictions: optional, and only ever tighten the
    // server-enforced limits above (intersection, not replacement).
    const clientAllowedTypes = (formData.get("allowedTypes") as string)?.split(",").filter(Boolean) || [];
    const clientMaxSizeMb = parseInt((formData.get("maxSize") as string) || "0", 10);
    const maxSize = Math.min(
      Number.isFinite(clientMaxSizeMb) && clientMaxSizeMb > 0
        ? clientMaxSizeMb * 1024 * 1024
        : SERVER_MAX_FILE_SIZE,
      SERVER_MAX_FILE_SIZE
    );

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1) Server-enforced master allowlist (rejects empty/unknown MIME types)
    if (!validateFileType(file, SERVER_ALLOWED_TYPES)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 }
      );
    }

    // 2) Optional client narrowing (e.g. an avatar field accepting images only)
    if (clientAllowedTypes.length > 0 && !validateFileType(file, clientAllowedTypes)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${clientAllowedTypes.join(", ")}` },
        { status: 400 }
      );
    }

    if (!validateFileSize(file, maxSize)) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${formatFileSize(maxSize)}` },
        { status: 400 }
      );
    }

    const path = generateUserPath(userId, file.name, folder);

    let fileToUpload: File | Blob = file;
    if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
      const svgText = await file.text();
      const sanitizedSvg = sanitizeSvg(svgText);
      fileToUpload = new Blob([sanitizedSvg], { type: "image/svg+xml" });
    }

    const { data, error } = await supabase.storage.from("uploads").upload(path, fileToUpload, {
      upsert: false,
      contentType: file.type,
      cacheControl: "3600",
    });

    if (error) {
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    const { data: publicUrlData } = supabase.storage.from("uploads").getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      file: {
        path: data.path,
        fullPath: data.fullPath,
        publicUrl: publicUrlData.publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, supabase } = auth;

    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: "Invalid Origin/Referer (CSRF)" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const paths = searchParams.get("paths")?.split(",").filter(Boolean) || [];

    if (paths.length === 0) {
      return NextResponse.json({ error: "No paths provided" }, { status: 400 });
    }

    // Security check (IDOR): every path must contain the VERIFIED user id as
    // a path segment. Paths generated by this route are either
    // `<folder>/<userId>/<file>` or `<userId>/<file>`.
    const invalidPaths = paths.filter((path) => {
      const cleanPath = path.replace(/^\/+|\/+$/g, "");
      const parts = cleanPath.split("/");
      return !parts.includes(userId);
    });

    if (invalidPaths.length > 0) {
      return NextResponse.json(
        { error: "Forbidden: You can only delete your own files" },
        { status: 403 }
      );
    }

    const { error } = await supabase.storage.from("uploads").remove(paths);

    if (error) {
      return NextResponse.json({ error: `Delete failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
