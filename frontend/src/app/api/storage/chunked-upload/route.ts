import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { generateUserPath, validateFileType } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import {
  initiateUpload,
  registerChunk,
  getOrderedChunks,
  getSessionMeta,
  isUploadComplete,
  getUploadProgress,
  markUploadCompleted,
  cleanupUpload,
  getRedisClient,
} from "@/lib/redis";

// ─── Configuration ─────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB max total
const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB per chunk
const MAX_CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB max per chunk

// ─── Types ─────────────────────────────────────────────────────────────────

interface InitiateBody {
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize?: number;
  folder?: string;
}

interface UploadChunkBody {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
}

// ─── POST: Initiate or upload a chunk ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    const userId = "anonymous";

    // Validate that Redis is available for chunked uploads
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured or disabled. Chunked uploads require Redis." },
        { status: 503 }
      );
    }

    // Check content type to determine operation
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      // ── Initiate a new chunked upload session ──────────────────────────
      const body: InitiateBody = await request.json();

      if (!body.fileName || !body.fileSize || !body.totalChunks) {
        return NextResponse.json(
          { error: "Missing required fields: fileName, fileSize, totalChunks" },
          { status: 400 }
        );
      }

      if (body.fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File size exceeds maximum of ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)} MB` },
          { status: 400 }
        );
      }

      const chunkSize = body.chunkSize || DEFAULT_CHUNK_SIZE;
      if (chunkSize > MAX_CHUNK_SIZE) {
        return NextResponse.json(
          { error: `Chunk size exceeds maximum of ${(MAX_CHUNK_SIZE / 1024 / 1024).toFixed(0)} MB` },
          { status: 400 }
        );
      }

      const uploadId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      await initiateUpload({
        uploadId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType: body.mimeType || "application/octet-stream",
        totalChunks: body.totalChunks,
        chunkSize,
        folder: body.folder || "uploads",
        userId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return NextResponse.json({
        success: true,
        uploadId,
        chunkSize,
        totalChunks: body.totalChunks,
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (contentType.includes("multipart/form-data")) {
      // ── Upload a chunk ─────────────────────────────────────────────────
      const formData = await request.formData();
      const uploadId = formData.get("uploadId") as string;
      const chunkIndexStr = formData.get("chunkIndex") as string;
      const totalChunksStr = formData.get("totalChunks") as string;
      const file = formData.get("file") as File;
      const folder = (formData.get("folder") as string) || "uploads";

      if (!uploadId || !chunkIndexStr || !file) {
        return NextResponse.json(
          { error: "Missing required fields: uploadId, chunkIndex, file" },
          { status: 400 }
        );
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);
      const totalChunks = parseInt(totalChunksStr || "0", 10);

      // Verify session exists
      const session = await getSessionMeta(uploadId);
      if (!session) {
        return NextResponse.json(
          { error: "Upload session not found or expired" },
          { status: 404 }
        );
      }

      // Validate file type if types are specified
      const allowedTypes = (formData.get("allowedTypes") as string)?.split(",") || [];
      if (allowedTypes.length > 0 && !validateFileType(file, allowedTypes)) {
        return NextResponse.json(
          { error: `File type not allowed. Allowed: ${allowedTypes.join(", ")}` },
          { status: 400 }
        );
      }

      // Generate a path for this chunk
      const chunkPath = generateUserPath(
        userId,
        `.chunk_${uploadId}_${chunkIndex}_${file.name}`,
        `${folder}/_chunks`
      );

      // Upload chunk to Supabase storage
      let fileToUpload: File | Blob = file;
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        const svgText = await file.text();
        const sanitizedSvg = sanitizeSvg(svgText);
        fileToUpload = new Blob([sanitizedSvg], { type: "image/svg+xml" });
      }

      const { data, error } = await supabase.storage.from("uploads").upload(chunkPath, fileToUpload, {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600",
      });

      if (error) {
        return NextResponse.json({ error: `Chunk upload failed: ${error.message}` }, { status: 500 });
      }

      // Register chunk in Redis
      const progress = await registerChunk(uploadId, chunkIndex, file.size, data.path);

      const isComplete = totalChunks > 0 && progress.receivedChunks >= totalChunks;

      return NextResponse.json({
        success: true,
        chunkIndex,
        receivedChunks: progress.receivedChunks,
        totalChunks,
        isComplete,
        chunkPath: data.path,
      });
    }

    return NextResponse.json({ error: "Unsupported content type" }, { status: 400 });
  } catch (error) {
    console.error("Chunked upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chunked upload failed" },
      { status: 500 }
    );
  }
}

// ─── GET: Check upload progress ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    // Validate that Redis is available for chunked uploads
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured or disabled. Chunked uploads require Redis." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "Missing uploadId query parameter" },
        { status: 400 }
      );
    }

    const progress = await getUploadProgress(uploadId);
    if (!progress) {
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      uploadId,
      ...progress,
    });
  } catch (error) {
    console.error("Chunked upload progress error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get progress" },
      { status: 500 }
    );
  }
}

// ─── PUT: Complete/Finalize upload ─────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    // Validate that Redis is available for chunked uploads
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured or disabled. Chunked uploads require Redis." },
        { status: 503 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);

    const body = await request.json();
    const { uploadId } = body as { uploadId: string };

    if (!uploadId) {
      return NextResponse.json(
        { error: "Missing uploadId" },
        { status: 400 }
      );
    }

    // Verify session and all chunks received
    const session = await getSessionMeta(uploadId);
    if (!session) {
      return NextResponse.json(
        { error: "Upload session not found or expired" },
        { status: 404 }
      );
    }

    const complete = await isUploadComplete(uploadId);
    if (!complete) {
      const progress = await getUploadProgress(uploadId);
      return NextResponse.json(
        {
          error: "Not all chunks have been uploaded yet",
          receivedChunks: progress?.receivedChunks || 0,
          totalChunks: progress?.totalChunks || 0,
        },
        { status: 400 }
      );
    }

    // Get ordered chunks
    const chunks = await getOrderedChunks(uploadId);

    // Mark as completed in Redis (prevents duplicate assembly)
    await markUploadCompleted(uploadId);

    // Return the list of chunk paths for the client or server to reassemble
    const chunkPaths = chunks.map((c) => c.path);

    return NextResponse.json({
      success: true,
      uploadId,
      fileName: session.fileName,
      mimeType: session.mimeType,
      fileSize: session.fileSize,
      totalChunks: chunks.length,
      chunks: chunkPaths,
      message: "All chunks uploaded. Use the returned chunks array to trigger reassembly.",
    });
  } catch (error) {
    console.error("Chunked upload finalize error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to finalize upload" },
      { status: 500 }
    );
  }
}

// ─── DELETE: Cancel/cleanup an upload session ──────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    // Validate that Redis is available for chunked uploads
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured or disabled. Chunked uploads require Redis." },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const uploadId = searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "Missing uploadId query parameter" },
        { status: 400 }
      );
    }

    // Get chunks for cleanup on storage
    const chunks = await getOrderedChunks(uploadId);
    const paths = chunks.map((c) => c.path);

    // Cleanup Redis keys
    await cleanupUpload(uploadId);

    // Cleanup stored chunk files from Supabase
    if (paths.length > 0) {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      // Remove in batches of 100 (Supabase limit)
      for (let i = 0; i < paths.length; i += 100) {
        const batch = paths.slice(i, i + 100);
        await supabase.storage.from("uploads").remove(batch);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Upload session cancelled and cleaned up",
    });
  } catch (error) {
    console.error("Chunked upload cancel error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel upload" },
      { status: 500 }
    );
  }
}