import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { generateUserPath, validateFileType, validateFileSize, formatFileSize } from "@/lib/storage";

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
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

    const userId = "anonymous";
    const path = generateUserPath(userId, file.name, folder);

    const { data, error } = await supabase.storage.from("uploads").upload(path, file, {
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
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const { searchParams } = new URL(request.url);
    const paths = searchParams.get("paths")?.split(",") || [];

    if (paths.length === 0) {
      return NextResponse.json({ error: "No paths provided" }, { status: 400 });
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