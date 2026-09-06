import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/utils/supabase/server-admin";
import { verifyAccessToken } from "@/lib/auth/jwt-edge";
import { generateUserPath, validateFileType } from "@/lib/storage";
import { sanitizeSvg } from "@/lib/storage/svg-sanitizer";
import {
  isFileTypeAllowed,
  sanitizeFolder,
  MAX_CHUNKED_UPLOAD_SIZE,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  hasValidContentSignature,
} from "@/lib/storage/upload-policy";
import {
  initiateUpload,
  registerChunk,
  getOrderedChunks,
  getSessionMeta,
  validateUploadCompletion,
  getUploadProgress,
  compareAndSetSessionStatus,
  updateSessionStatus,
  markUploadCompleted,
  cleanupUpload,
  getRedisClient,
} from "@/lib/redis";

// ─── Auth Helper ────────────────────────────────────────────────────────────
/**
 * Resolves the authenticated user from the canonical backend access token.
 * Supabase is used only as the storage provider after this identity check;
 * it is not a second application authentication source.
 */
async function getAuthenticatedUserId(request: NextRequest): Promise<{ userId: string; supabase: ReturnType<typeof createAdminClient> } | null> {
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) return null;

  const payload = await verifyAccessToken(accessToken);
  const userId = payload?.userId || payload?.sub;
  if (!userId) return null;

  return { userId, supabase: createAdminClient() };
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
    const auth = await getAuthenticatedUserId(request);
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
      const chunkMime = file.type && isFileTypeAllowed(file.type) ? file.type : session.mimeType;
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
      if (chunkIndex === 0 && !hasValidContentSignature(fileBuffer, chunkMime)) {
        return NextResponse.json(
          { error: "File content does not match the declared MIME type" },
          { status: 400 },
        );
      }
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

      // SECURITY: fail-closed SVG handling. If the chunk is an SVG we MUST
      // sanitize it before it ever touches storage, and we MUST reject the
      // chunk if sanitization cannot produce a safe result. Falling back to
      // the original bytes here would smuggle script tags, on-handlers and
      // foreignObject payloads straight into the user's storage and out to
      // whoever later fetches the public URL.
      let fileToUpload: File | Blob = file;
      if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
        let sanitizedSvg: string;
        try {
          const svgText = fileBuffer.toString("utf-8");
          sanitizedSvg = sanitizeSvg(svgText);
        } catch (e) {
          console.error("SVG sanitization threw; refusing chunk", e);
          return NextResponse.json(
            { error: "SVG chunk could not be safely sanitized and was rejected." },
            { status: 400 }
          );
        }

        // DOMPurify returns an empty string for fully-hostile input rather
        // than throwing. Treat empty output as a rejection: an SVG chunk
        // that sanitizes to nothing is not a usable file, and silently
        // uploading "" would mask the attack from the client.
        if (!sanitizedSvg || !sanitizedSvg.trim()) {
          return NextResponse.json(
            { error: "SVG chunk rejected by sanitizer (empty after sanitization)." },
            { status: 400 }
          );
        }

        fileToUpload = new Blob([sanitizedSvg], { type: "image/svg+xml" });
      }

      const { data, error } = await supabase.storage.from("uploads").upload(chunkPath, fileToUpload, {
        upsert: true,
        contentType: fileToUpload.type || chunkMime,
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
    const auth = await getAuthenticatedUserId(request);
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
    const auth = await getAuthenticatedUserId(request);
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

    // SECURITY: atomic CAS into the COMPLETING window.
    //
    // Two concurrent PUT /finalize calls will both pass the GET above while
    // the session is still UPLOADING. A plain updateSessionStatus() would
    // let BOTH enter the validate→markCompleted path, double-assembling or
    // racing on the same chunk set. The Lua-backed CAS ensures exactly one
    // caller wins the transition; every other concurrent caller gets
    // 'stale' here and a 409 below.
    const cas = await compareAndSetSessionStatus(uploadId, "COMPLETING", null);
    if (cas !== "ok") {
      return NextResponse.json(
        {
          error: cas === "missing"
            ? "Upload session not found"
            : "Upload session is already finalizing or completed (concurrent finalize rejected)",
          status: cas === "stale" ? "COMPLETING" : undefined,
        },
        { status: cas === "missing" ? 404 : 409 }
      );
    }

    // Exhaustive completion validation:
    // 1. indices = [0 ... totalChunks - 1] exactly
    // 2. sum(chunk.size) == declared fileSize
    // 3. all checksum formats valid
    const validation = await validateUploadCompletion(uploadId);
    if (!validation.valid) {
      // Revert status back to UPLOADING so missing chunks can be recovered.
      // Use CAS so a concurrent winner of a retry doesn't accidentally
      // yank a session that's already moved forward.
      await compareAndSetSessionStatus(uploadId, "UPLOADING", "COMPLETING");
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

    // Mark as completed in Redis. This is itself a CAS-gated transition
    // (COMPLETING -> COMPLETED) so a stray late finalize call that somehow
    // gets past the COMPLETING gate still cannot overwrite a COMPLETED
    // session back to COMPLETING and trigger a second assembly.
    const completed = await markUploadCompleted(uploadId);
    if (completed !== "ok") {
      return NextResponse.json(
        { error: "Upload session state changed during finalize; aborted" },
        { status: 409 }
      );
    }

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
    const auth = await getAuthenticatedUserId(request);
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