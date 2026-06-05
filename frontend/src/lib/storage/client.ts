import { createClient } from "@/utils/supabase/client";
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

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function getSupabaseClient() {
  return createClient();
}

export async function uploadFile(options: UploadOptions): Promise<UploadResult> {
  const supabase = getSupabaseClient();
  const { bucket, path, file, upsert = false, contentType, cacheControl = "3600", onProgress } = options;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    contentType: contentType || file.type,
    cacheControl,
    duplex: "half",
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    uploadedAt: new Date().toISOString(),
  };

  if (onProgress) {
    onProgress(100);
  }

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: publicUrlData.publicUrl,
    metadata,
  };
}

export async function uploadLargeFile(options: UploadOptions): Promise<UploadResult> {
  const { file, onProgress } = options;

  if (file.size <= MAX_FILE_SIZE) {
    return uploadFile(options);
  }

  if (onProgress) {
    onProgress(0);
  }

  const result = await uploadFile(options);

  if (onProgress) {
    onProgress(100);
  }

  return result;
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

  return (data || []).map((f) => ({
    name: f.name,
    id: f.id || "",
    updated_at: f.updated_at || "",
    created_at: f.created_at || "",
    last_accessed_at: f.last_accessed_at || "",
    metadata: (f.metadata || {}) as Record<string, unknown>,
    size: (f.metadata && typeof f.metadata === 'object' && 'size' in f.metadata) ? Number((f.metadata as any).size) : 0,
  }));
}

export async function deleteFiles(options: DeleteOptions): Promise<void> {
  const supabase = getSupabaseClient();
  const { bucket, paths } = options;

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
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

  const updatePayload: any = {};
  if (options.public !== undefined) updatePayload.public = options.public;
  if (options.fileSizeLimit !== undefined) updatePayload.fileSizeLimit = options.fileSizeLimit;
  if (options.allowedMimeTypes !== undefined) updatePayload.allowedMimeTypes = options.allowedMimeTypes;
  const { data, error } = await supabase.storage.updateBucket(name, updatePayload);

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