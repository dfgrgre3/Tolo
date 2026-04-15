import { NextRequest, NextResponse } from "next/server";
import {
  existsSync,
  mkdirSync,
  rmSync,
} from "fs";
import {
  appendFile,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { logger } from "@/lib/logger";
import { withAdmin } from "@/lib/api-utils";

const DEFAULT_CHUNK_SIZE = 100 * 1024 * 1024;
const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024 * 1024; // 100GB
const MAX_FILE_SIZE = Number(
  process.env.MAX_CHUNKED_UPLOAD_SIZE_BYTES || `${DEFAULT_MAX_FILE_SIZE}`,
);
const TEMP_ROOT = join(process.cwd(), "tmp", "chunked-uploads");
const UPLOADS_ROOT = join(process.cwd(), "public", "uploads");

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
  "video/mpeg",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type UploadSession = {
  uploadId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  chunkSize: number;
  createdAt: string;
};

function ensureDirectory(path: string) {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
}

function sanitizeFileName(fileName: string) {
  const cleaned = fileName.replace(/[^a-zA-Z0-9._-\u0600-\u06FF]+/g, "-");
  return cleaned || "upload.bin";
}

function sessionDir(uploadId: string) {
  return join(TEMP_ROOT, uploadId);
}

function sessionMetaPath(uploadId: string) {
  return join(sessionDir(uploadId), "session.json");
}

async function readSession(uploadId: string): Promise<UploadSession | null> {
  try {
    const raw = await readFile(sessionMetaPath(uploadId), "utf8");
    return JSON.parse(raw) as UploadSession;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  return withAdmin(request, async (authUser) => {
    try {
      const body = await request.json();
      const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
      const fileType = typeof body?.fileType === "string" ? body.fileType.trim() : "";
      const fileSize = Number(body?.fileSize || 0);
      const chunkSize = Number(body?.chunkSize || DEFAULT_CHUNK_SIZE);

      if (!fileName || !fileType || !Number.isFinite(fileSize) || fileSize <= 0) {
        return NextResponse.json({ error: "بيانات الملف غير صالحة" }, { status: 400 });
      }

      if (!ALLOWED_MIME_TYPES.includes(fileType)) {
        return NextResponse.json({ error: "نوع الملف غير مسموح به" }, { status: 415 });
      }

      if (fileSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `حجم الملف كبير جداً. الحد الأقصى هو ${Math.round(MAX_FILE_SIZE / (1024 * 1024 * 1024))}GB` },
          { status: 413 },
        );
      }

      const uploadId = randomUUID();
      const session: UploadSession = {
        uploadId,
        fileName: sanitizeFileName(fileName),
        fileType,
        fileSize,
        chunkSize: Number.isFinite(chunkSize) && chunkSize > 0 ? chunkSize : DEFAULT_CHUNK_SIZE,
        createdAt: new Date().toISOString(),
      };

      ensureDirectory(sessionDir(uploadId));
      await writeFile(sessionMetaPath(uploadId), JSON.stringify(session, null, 2), "utf8");

      logger.info("Chunked upload session initialized", {
        uploadId,
        fileName: session.fileName,
        fileSize: session.fileSize,
        adminId: authUser.userId,
      });

      return NextResponse.json({ uploadId, chunkSize: session.chunkSize });
    } catch (error) {
      logger.error("Failed to initialize chunked upload", error);
      return NextResponse.json({ error: "فشل بدء الرفع المجزأ" }, { status: 500 });
    }
  });
}

export async function PUT(request: NextRequest) {
  return withAdmin(request, async () => {
    try {
      const formData = await request.formData();
      const uploadId = String(formData.get("uploadId") || "");
      const chunkIndex = Number(formData.get("chunkIndex") || -1);
      const chunk = formData.get("chunk");

      if (!uploadId || !Number.isInteger(chunkIndex) || chunkIndex < 0 || !(chunk instanceof Blob)) {
        return NextResponse.json({ error: "بيانات الجزء غير صالحة" }, { status: 400 });
      }

      const session = await readSession(uploadId);
      if (!session) {
        return NextResponse.json({ error: "جلسة الرفع غير موجودة" }, { status: 404 });
      }

      const chunkPath = join(sessionDir(uploadId), `${chunkIndex}.part`);
      const buffer = Buffer.from(await chunk.arrayBuffer());
      await writeFile(chunkPath, buffer);

      return NextResponse.json({ success: true, chunkIndex });
    } catch (error) {
      logger.error("Failed to save upload chunk", error);
      return NextResponse.json({ error: "فشل حفظ جزء الملف" }, { status: 500 });
    }
  });
}

export async function PATCH(request: NextRequest) {
  return withAdmin(request, async (authUser) => {
    try {
      const body = await request.json();
      const uploadId = typeof body?.uploadId === "string" ? body.uploadId : "";

      if (!uploadId) {
        return NextResponse.json({ error: "معرف الرفع مطلوب" }, { status: 400 });
      }

      const session = await readSession(uploadId);
      if (!session) {
        return NextResponse.json({ error: "جلسة الرفع غير موجودة" }, { status: 404 });
      }

      ensureDirectory(UPLOADS_ROOT);

      const extension = session.fileName.includes(".")
        ? session.fileName.split(".").pop()
        : "bin";
      const finalFileName = `${randomUUID()}.${extension}`;
      const tempMergedPath = join(sessionDir(uploadId), "merged.tmp");
      const finalPath = join(UPLOADS_ROOT, finalFileName);
      const totalChunks = Math.ceil(session.fileSize / session.chunkSize);

      await writeFile(tempMergedPath, Buffer.alloc(0));

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex += 1) {
        const chunkPath = join(sessionDir(uploadId), `${chunkIndex}.part`);
        if (!existsSync(chunkPath)) {
          return NextResponse.json(
            { error: `الجزء رقم ${chunkIndex + 1} مفقود ولا يمكن تجميع الملف` },
            { status: 400 },
          );
        }

        await appendFile(tempMergedPath, await readFile(chunkPath));
        await unlink(chunkPath);
      }

      const mergedStats = await stat(tempMergedPath);
      if (mergedStats.size !== session.fileSize) {
        return NextResponse.json({ error: "حجم الملف النهائي غير مطابق" }, { status: 400 });
      }

      await rename(tempMergedPath, finalPath);

      try {
        rmSync(sessionDir(uploadId), { recursive: true, force: true });
      } catch {
        logger.warn("Failed to clean chunk upload temp directory", { uploadId });
      }

      logger.info("Chunked upload completed", {
        uploadId,
        finalFileName,
        fileSize: session.fileSize,
        adminId: authUser.userId,
      });

      return NextResponse.json({
        message: "تم رفع الملف بنجاح",
        fileUrl: `/uploads/${finalFileName}`,
        fileName: session.fileName,
        fileSize: session.fileSize,
        fileType: session.fileType,
      });
    } catch (error) {
      logger.error("Failed to finalize chunked upload", error);
      return NextResponse.json({ error: "فشل تجميع الملف النهائي" }, { status: 500 });
    }
  });
}
