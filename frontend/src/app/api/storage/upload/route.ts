import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { generateUserPath, validateFileType, validateFileSize, formatFileSize } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF validation via strict Origin/Referer matching
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host") || "";
    const expectedHost = host.split(":")[0];

    let isCsrfValid = false;

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.hostname === expectedHost) {
          isCsrfValid = true;
        }
      } catch {
        // Ignore invalid URL
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.hostname === expectedHost) {
          isCsrfValid = true;
        }
      } catch {
        // Ignore invalid URL
      }
    }

    if (!isCsrfValid) {
      return NextResponse.json({ error: "Invalid Origin/Referer (CSRF)" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = (formData.get("folder") as string) || "uploads";
    const allowedTypes = (formData.get("allowedTypes") as string)?.split(",") || [];
    const maxSize = parseInt((formData.get("maxSize") as string) || "100", 10) * 1024 * 1024;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!validateFileType(file, allowedTypes)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed: ${allowedTypes.join(", ") || "any"}` },
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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // CSRF validation via strict Origin/Referer matching
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const host = request.headers.get("host") || "";
    const expectedHost = host.split(":")[0];

    let isCsrfValid = false;

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.hostname === expectedHost) {
          isCsrfValid = true;
        }
      } catch {
        // Ignore invalid URL
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.hostname === expectedHost) {
          isCsrfValid = true;
        }
      } catch {
        // Ignore invalid URL
      }
    }

    if (!isCsrfValid) {
      return NextResponse.json({ error: "Invalid Origin/Referer (CSRF)" }, { status: 403 });
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { searchParams } = new URL(request.url);
    const paths = searchParams.get("paths")?.split(",") || [];

    if (paths.length === 0) {
      return NextResponse.json({ error: "No paths provided" }, { status: 400 });
    }

    // Security check: Ensure all paths belong to the authenticated user to prevent IDOR deletions
    const invalidPaths = paths.filter(path => {
      const cleanPath = path.replace(/^\/+|\/+$/g, "");
      const parts = cleanPath.split("/");
      return parts[0] !== userId && parts[1] !== userId;
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