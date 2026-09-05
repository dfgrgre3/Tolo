import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createClient } from "@/utils/supabase/server-user";
import { generateUserPath, validateFileType } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import {
  isFileTypeAllowed,
  sanitizeFolder,
  MAX_CHUNKED_UPLOAD_SIZE,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
} from "@/lib/storage/upload-policy";
import {
  initiateUpload,
  registerChunk,
  getSessionMeta,
  validateUploadCompletion,
  getUploadProgress,
  updateSessionStatus,
  markUploadCompleted,
  cleanupUpload,
  getRedisClient,
} from "@/lib/redis";

// ─── Auth Helper ────────────────────────────────────────────────────────────
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

// ─── Types ─────────────────────────────────────────────────────────────────

interface InitiateBody {
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize?: number;
  folder?: string;
}

// ─── POST: Initiate or upload a chunk ──────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, supabase } = auth;

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

      if (!Number.isInteger(body.totalChunks) || body.totalChunks <= 0) {
        return NextResponse.json(
          { error: "totalChunks must be a positive integer" },
          { status: 400 }
        );
      }

      if (body.fileSize <= 0 || body.fileSize > MAX_CHUNKED_UPLOAD_SIZE) {
        return NextResponse.json(
          { error: `File size must be between 1 byte and ${(MAX_CHUNKED_UPLOAD_SIZE / 1024 / 1024).toFixed(0)} MB` },
          { status: 400 }
        );
      }

      // Server-enforced MIME allowlist — client-declared values can only narrow it later
      const mimeType = body.mimeType || "application/octet-stream";
      if (!isFileTypeAllowed(mimeType)) {
        return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
      }

      const folder = sanitizeFolder(body.folder || "uploads");

      const chunkSize = body.chunkSize || DEFAULT_CHUNK_SIZE;
      if (chunkSize <= 0 || chunkSize > MAX_CHUNK_SIZE) {
        return NextResponse.json(
          { error: `Chunk size exceeds maximum of ${(MAX_CHUNK_SIZE / 1024 / 1024).toFixed(0)} MB` },
          { status: 400 }
        );
      }

      const uploadId = crypto.randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

      // Initiate session with immutable totalChunks and initial 'CREATED' status
      await initiateUpload({
        uploadId,
        fileName: body.fileName,
        fileSize: body.fileSize,
        mimeType,
        totalChunks: body.totalChunks,
        chunkSize,
        folder,
        userId,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      return NextResponse.json({
        success: true,
        uploadId,
        chunkSize,
        totalChunks: body.totalChunks,
        status: "CREATED",
        expiresAt: expiresAt.toISOString(),
      });
    }

    if (contentType.includes("multipart/form-data")) {
      // ── Upload a chunk ─────────────────────────────────────────────────
      const formData = await request.formData();
      const uploadId = formData.get("uploadId") as string;
      const chunkIndexStr = formData.get("chunkIndex") as string;
      const file = formData.get("file") as File;
      const folder = sanitizeFolder((formData.get("folder") as string) || "uploads");
      // Optional SHA-256 checksum for integrity verification.
      // Clients should send this as the X-Chunk-Checksum request header or
      // as a "chunkChecksum" form field (header takes precedence).
      const chunkChecksum =
        request.headers.get("x-chunk-checksum") ||
        (formData.get("chunkChecksum") as string | null) ||
        undefined;

      if (!uploadId || chunkIndexStr === null || chunkIndexStr === undefined || !file) {
        return NextResponse.json(
          { error: "Missing required fields: uploadId, chunkIndex, file" },
          { status: 400 }
        );
      }

      const chunkIndex = parseInt(chunkIndexStr, 10);

      // Verify session exists and belongs to user
      const session = await getSessionMeta(uploadId);
      if (!session || session.userId !== userId) {
        return NextResponse.json(
          { error: "Upload session not found or access denied" },
          { status: 404 }
        );
      }

      // State machine validation: reject any upload if session is COMPLETED, COMPLETING, or EXPIRED
      if (session.status === "COMPLETED") {
        return NextResponse.json(
          { error: "Cannot upload chunk: session is already completed", status: session.status },
          { status: 409 }
        );
      }
      if (session.status === "COMPLETING") {
        return NextResponse.json(
          { error: "Cannot upload chunk: session is currently finalizing", status: session.status },
          { status: 409 }
        );
      }
      if (session.status === "EXPIRED") {
        return NextResponse.json(
          { error: "Cannot upload chunk: session has expired", status: session.status },
          { status: 410 }
        );
      }

      // Chunk index validation: strictly 0 <= chunkIndex < session.totalChunks
      // session.totalChunks is immutable and determined at initiateUpload
      if (!Number.isInteger(chunkIndex) || chunkIndex < 0 || chunkIndex >= session.totalChunks) {
        return NextResponse.json(
          {
            error: `Invalid chunkIndex: must be an integer between 0 and ${session.totalChunks - 1}`,
            chunkIndex,
            totalChunks: session.totalChunks,
          },
          { status: 400 }
        );
      }

      // Validate file type: server-enforced allowlist first. Fall back to the
      // session-declared type when the client doesn't set one on the chunk.
      const chunkMime = file.type || session.mimeType;
      if (!isFileTypeAllowed(chunkMime)) {
        return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
      }

      // Optional client narrowing (can only restrict, never widen)
      const allowedTypes = (formData.get("allowedTypes") as string)?.split(",").filter(Boolean) || [];
      if (allowedTypes.length > 0 && !validateFileType(file, allowedTypes)) {
        return NextResponse.json(
          { error: `File type not allowed. Allowed: ${allowedTypes.join(", ")}` },
          { status: 400 }
        );
      }

      // Verify chunk data checksum if provided by client
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      if (chunkChecksum) {
        const computedChecksum = createHash("sha256").update(fileBuffer).digest("hex");
        if (computedChecksum.toLowerCase() !== chunkChecksum.toLowerCase()) {
          return NextResponse.json(
            {
              error: "Chunk checksum mismatch: data corrupted or tampered in transit",
              expected: chunkChecksum,
              computed: computedChecksum,
            },
            { status: 400 }
          );
        }
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
        const svgText = fileBuffer.toString("utf-8");
        const sanitizedSvg = sanitizeSvg(svgText);
        fileToUpload = new Blob([sanitizedSvg], { type: "image/svg+xml" });
      }

      const { data, error } = await supabase.storage.from("uploads").upload(chunkPath, fileToUpload, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

      if (error) {
        return NextResponse.json({ error: `Chunk upload failed: ${error.message}` }, { status: 500 });
      }

      // Register chunk in Redis (with optional checksum for integrity tracking)
      const progress = await registerChunk(uploadId, chunkIndex, file.size, data.path, chunkChecksum);

      const isComplete = progress.receivedChunks === session.totalChunks;

      return NextResponse.json({
        success: true,
        chunkIndex,
        receivedChunks: progress.receivedChunks,
        totalChunks: session.totalChunks,
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = auth;

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

    const session = await getSessionMeta(uploadId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { error: "Upload session not found or access denied" },
        { status: 404 }
      );
    }

    const progress = await getUploadProgress(uploadId);
    if (!progress) {
      return NextResponse.json(
        { error: "Upload progress not found" },
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = auth;

    // Validate that Redis is available for chunked uploads
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis is not configured or disabled. Chunked uploads require Redis." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { uploadId } = body as { uploadId: string };

    if (!uploadId) {
      return NextResponse.json(
        { error: "Missing uploadId" },
        { status: 400 }
      );
    }

    // Verify session exists and belongs to user
    const session = await getSessionMeta(uploadId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { error: "Upload session not found or access denied" },
        { status: 404 }
      );
    }

    // Check state machine: if already COMPLETED, prevent double-completion
    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Upload session is already completed", status: session.status },
        { status: 409 }
      );
    }
    if (session.status === "EXPIRED") {
      return NextResponse.json(
        { error: "Upload session has expired", status: session.status },
        { status: 410 }
      );
    }

    // Atomically transition status to COMPLETING
    await updateSessionStatus(uploadId, "COMPLETING");

    // Exhaustive completion validation:
    // 1. indices = [0 ... totalChunks - 1] exactly
    // 2. sum(chunk.size) == declared fileSize
    // 3. all checksum formats valid
    const validation = await validateUploadCompletion(uploadId);
    if (!validation.valid) {
      // Revert status back to UPLOADING so missing chunks can be recovered
      await updateSessionStatus(uploadId, "UPLOADING");
      return NextResponse.json(
        {
          error: validation.error || "Chunk completion validation failed",
          totalChunks: session.totalChunks,
          receivedChunks: validation.chunks.length,
          receivedSize: validation.totalSize,
          declaredSize: session.fileSize,
        },
        { status: 400 }
      );
    }

    // Mark as completed in Redis (prevents duplicate assembly or subsequent uploads)
    await markUploadCompleted(uploadId);

    // Return the list of chunk paths for assembly
    const chunkPaths = validation.chunks.map((c) => c.path);

    return NextResponse.json({
      success: true,
      uploadId,
      fileName: session.fileName,
      mimeType: session.mimeType,
      fileSize: session.fileSize,
      totalChunks: validation.chunks.length,
      chunks: chunkPaths,
      status: "COMPLETED",
      message: "All chunks validated and complete. Ready for reassembly.",
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
    const auth = await getAuthenticatedUserId();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId, supabase } = auth;

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

    const session = await getSessionMeta(uploadId);
    if (!session || session.userId !== userId) {
      return NextResponse.json(
        { error: "Upload session not found or access denied" },
        { status: 404 }
      );
    }

    // Get chunks for cleanup on storage
    const chunks = await getOrderedChunks(uploadId);
    const paths = chunks.map((c) => c.path);

    // Cleanup Redis keys
    await cleanupUpload(uploadId);

    // Cleanup stored chunk files from Supabase
    if (paths.length > 0) {
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