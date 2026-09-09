import { createClient } from "@/utils/supabase/client";
import { apiClient } from "@/lib/api/api-client";
import { sanitizeSvg } from "./svg-sanitizer";
import type {
  UploadOptions,
  UploadResult,
  FileMetadata,
  SignedUrlOptions,
  ListFilesOptions,
  FileListItem,
  DeleteOptions,
  CreateBucketOptions,
  BucketInfo,
  ImageTransformOptions,
} from "./types";

export type {
  UploadOptions,
  UploadResult,
  FileMetadata,
  SignedUrlOptions,
  ListFilesOptions,
  FileListItem,
  DeleteOptions,
  CreateBucketOptions,
  BucketInfo,
  ImageTransformOptions,
};

import { MAX_SIMPLE_UPLOAD_SIZE, MAX_CHUNKED_UPLOAD_SIZE } from "./upload-policy";

export const MAX_FILE_SIZE = MAX_SIMPLE_UPLOAD_SIZE;
export { MAX_SIMPLE_UPLOAD_SIZE, MAX_CHUNKED_UPLOAD_SIZE };

export function getSupabaseClient() {
  return createClient();
}

async function prepareUploadFile(file: File): Promise<File> {
  const lowerName = file.name.toLowerCase();
  const isSvg = file.type === "image/svg+xml" || lowerName.endsWith(".svg");

  const isRasterImage = file.type.startsWith("image/") ||
    /\.(png|jpe?g|gif|bmp|tiff?|avif)$/i.test(lowerName);

  if (!isSvg && isRasterImage) {
    return convertRasterImageToWebP(file);
  }

  if (!isSvg) return file;

  // Every upload mode must sanitize SVG before bytes leave the browser.
  let sanitizedText: string;
  try {
    sanitizedText = sanitizeSvg(await file.text());
  } catch (error) {
    console.error("SVG sanitization failed; refusing to upload raw file", error);
    throw new Error("SVG validation failed: the file could not be safely sanitized and was rejected.");
  }

  if (!sanitizedText || !sanitizedText.trim()) {
    throw new Error("SVG validation failed: sanitizer produced empty output (file rejected as unsafe).");
  }

  return new File([sanitizedText], file.name, {
    type: "image/svg+xml",
    lastModified: file.lastModified,
  });
}

/**
 * Convert raster images before they leave the browser.
 *
 * Keeping this in the shared storage client means simple uploads, large
 * uploads, avatars, thumbnails, and library images all use the same policy.
 * SVG is intentionally handled separately: it must remain vector data and is
 * sanitized above instead of being rasterized.
 */
async function convertRasterImageToWebP(file: File): Promise<File> {
  if (file.type === "image/webp") {
    if (file.name.toLowerCase().endsWith(".webp")) return file;
    return new File([file], file.name.replace(/\.[^.]+$/, ".webp"), {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  }

  if (typeof document === "undefined" || typeof URL === "undefined") {
    throw new Error("Image conversion is only available in the browser.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("The image could not be decoded."));
    });

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error("The image has invalid dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) throw new Error("The browser does not support image conversion.");
    context.drawImage(image, 0, 0);

    const webpBlob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", 0.82),
    );

    if (!webpBlob) throw new Error("The image could not be converted to WebP.");

    const webpName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([webpBlob], webpName, {
      type: "image/webp",
      lastModified: file.lastModified,
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, file, onProgress } = options;

  const fileToUpload = await prepareUploadFile(file);

  if (fileToUpload.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  /*
    // SECURITY: fail closed. If sanitization rejects the SVG (likely hostile),
    // we MUST NOT upload the original bytes — that would re-introduce the
    // very payloads (script tags, on-handlers, foreignObject XSS) the
    // sanitizer exists to block.
    let sanitizedText: string;
    try {
      const text = await file.text();
      sanitizedText = sanitizeSvg(text);
    } catch (e) {
      console.error("SVG sanitization failed; refusing to upload raw file", e);
      throw new Error(
        "SVG validation failed: the file could not be safely sanitized and was rejected."
      );
    }

    // DOMPurify returns "" for fully-hostile input instead of throwing.
    // Treat empty output as a rejection: silently uploading an empty
    // blob would mask the attack from the user and still bypass the
    // sanitizer's intent.
    if (!sanitizedText || !sanitizedText.trim()) {
      throw new Error(
        "SVG validation failed: sanitizer produced empty output (file rejected as unsafe)."
      );
    }

    fileToUpload = new File([sanitizedText], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }
  */

  const formData = new FormData();
  formData.append("file", fileToUpload);
  formData.append("context", bucket);
  formData.append("category", "any");

  const data = await apiClient.postForm<{ fileUrl: string; fileKey: string; fileName: string; fileSize: number; mimeType: string }>('/upload', formData);

  const metadata: FileMetadata = {
    name: fileToUpload.name,
    size: fileToUpload.size,
    type: fileToUpload.type,
    lastModified: fileToUpload.lastModified,
    uploadedAt: new Date().toISOString(),
  };

  if (onProgress) {
    onProgress(100);
  }

  return {
    path: data.fileKey,
    fullPath: data.fileKey,
    publicUrl: data.fileUrl,
    metadata,
  };
}

export async function uploadLargeFile(options: UploadOptions): Promise<UploadResult> {
  const { bucket, file, onProgress } = options;

  if (file.size <= MAX_FILE_SIZE) {
    return uploadFile(options);
  }

  const fileToUpload = await prepareUploadFile(file);

  if (onProgress) {
    onProgress(0);
  }

  // 1. Get presigned URL
  const presignData = await apiClient.post<{ uploadUrl: string; fileKey: string; publicUrl: string; expiresIn: number }>('/upload/presign', {
    fileName: fileToUpload.name,
    contentType: fileToUpload.type,
    fileSize: fileToUpload.size,
    context: bucket,
    category: "any"
  });

  // 2. Upload directly to S3 via fetch
  const response = await globalThis.fetch(presignData.uploadUrl, {
    method: 'PUT',
    body: fileToUpload,
    headers: {
      'Content-Type': fileToUpload.type,
    }
  });

  if (!response.ok) {
    throw new Error(`Large file upload failed: ${response.statusText}`);
  }

  if (onProgress) {
    onProgress(100);
  }

  const metadata: FileMetadata = {
    name: fileToUpload.name,
    size: fileToUpload.size,
    type: fileToUpload.type,
    lastModified: fileToUpload.lastModified,
    uploadedAt: new Date().toISOString(),
  };

  return {
    path: presignData.fileKey,
    fullPath: presignData.fileKey,
    publicUrl: presignData.publicUrl,
    metadata,
  };
}

export async function getSignedUrl(options: SignedUrlOptions): Promise<string> {
  const supabase = getSupabaseClient();
  const { bucket, path, expiresIn = 3600, download = false, transform } = options;

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn, {
    download: download ? "attachment" : undefined,
    ...(transform ? { transform: transform as Record<string, unknown> } : {}),
  });

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function getPublicUrl(bucket: string, path: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function listFiles(options: ListFilesOptions): Promise<FileListItem[]> {
  const supabase = getSupabaseClient();
  const { bucket, folder = "", limit = 100, offset = 0, sortBy } = options;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit,
    offset,
    sortBy: sortBy ? { column: sortBy.column, order: sortBy.order } : undefined,
  });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return (data || []).map((f) => {
    const metadata = f.metadata && typeof f.metadata === 'object'
      ? f.metadata as Record<string, unknown>
      : {};
    const rawSize = metadata.size;
    return {
    name: f.name,
    id: f.id || "",
    updated_at: f.updated_at || "",
    created_at: f.created_at || "",
    last_accessed_at: f.last_accessed_at || "",
    metadata,
    size: typeof rawSize === 'number' || typeof rawSize === 'string' ? Number(rawSize) : 0,
    };
  });
}

export async function deleteFiles(options: DeleteOptions): Promise<void> {
  const { paths } = options;

  for (const path of paths) {
    try {
      await apiClient.delete('/upload', {
        body: JSON.stringify({ fileKey: path }),
      });
    } catch (e) {
      console.error(`Failed to delete file ${path}:`, e);
      throw e;
    }
  }
}

export async function moveFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

export async function copyFile(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}

export async function createBucket(options: CreateBucketOptions): Promise<BucketInfo> {
  const supabase = getSupabaseClient();
  const { name, public: isPublic = false, fileSizeLimit, allowedMimeTypes } = options;

  const { data, error } = await supabase.storage.createBucket(name, {
    public: isPublic,
    fileSizeLimit,
    allowedMimeTypes,
  });

  if (error) {
    throw new Error(`Failed to create bucket: ${error.message}`);
  }

  return data as BucketInfo;
}

export async function getBucket(name: string): Promise<BucketInfo | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.getBucket(name);

  if (error) {
    if (error.message.includes("not found")) {
      return null;
    }
    throw new Error(`Failed to get bucket: ${error.message}`);
  }

  return data as BucketInfo;
}

export async function listBuckets(): Promise<BucketInfo[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(`Failed to list buckets: ${error.message}`);
  }

  return data as BucketInfo[];
}

export async function updateBucket(
  name: string,
  options: Partial<CreateBucketOptions>
): Promise<BucketInfo> {
  const supabase = getSupabaseClient();

  const updatePayload: Partial<Pick<CreateBucketOptions, 'public' | 'fileSizeLimit' | 'allowedMimeTypes'>> = {};
  if (options.public !== undefined) updatePayload.public = options.public;
  if (options.fileSizeLimit !== undefined) updatePayload.fileSizeLimit = options.fileSizeLimit;
  if (options.allowedMimeTypes !== undefined) updatePayload.allowedMimeTypes = options.allowedMimeTypes;
  const { data, error } = await supabase.storage.updateBucket(
    name,
    updatePayload as Parameters<typeof supabase.storage.updateBucket>[1],
  );

  if (error) {
    throw new Error(`Failed to update bucket: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to update bucket: No data returned");
  }

  return data as unknown as BucketInfo;
}

export async function deleteBucket(name: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.deleteBucket(name);

  if (error) {
    throw new Error(`Failed to delete bucket: ${error.message}`);
  }
}

export async function emptyBucket(name: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.storage.emptyBucket(name);

  if (error) {
    throw new Error(`Failed to empty bucket: ${error.message}`);
  }
}

export function getImageTransformUrl(
  bucket: string,
  path: string,
  transform: ImageTransformOptions
): string {
  const supabase = getSupabaseClient();
  return supabase.storage.from(bucket).getPublicUrl(path, {
    transform: transform as Record<string, unknown>,
  }).data.publicUrl;
}

/**
 * Legacy client-side path helper. Upload routes must not use this for
 * ownership: authenticated upload endpoints generate the storage key on the
 * backend. Keep this only for callers that explicitly need a local preview
 * path, never as an authorization boundary.
 */
export function generateUserPath(userId: string, fileName: string, folder?: string): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const basePath = folder ? `${folder}/${userId}` : userId;
  return `${basePath}/${timestamp}-${sanitizedName}`;
}

export function generatePublicPath(fileName: string, folder?: string): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const basePath = folder || "public";
  return `${basePath}/${timestamp}-${sanitizedName}`;
}

export function validateFileType(file: File, allowedTypes: string[]): boolean {
  if (allowedTypes.length === 0) return true;
  return allowedTypes.some((type) => {
    if (type.endsWith("/*")) {
      return file.type.startsWith(type.slice(0, -1));
    }
    return file.type === type;
  });
}

export function validateFileSize(file: File, maxSizeBytes: number): boolean {
  return file.size <= maxSizeBytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getFileExtension(fileName: string): string {
  return fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2);
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith("video/");
}

export function isAudioFile(file: File): boolean {
  return file.type.startsWith("audio/");
}

export function isDocumentFile(file: File): boolean {
  const docTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
  ];
  return docTypes.includes(file.type);
}
