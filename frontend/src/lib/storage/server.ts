import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
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

const DEFAULT_CHUNK_SIZE = 5 * 1024 * 1024;
const MAX_FILE_SIZE = 50 * 1024 * 1024;

async function getSupabaseServerClient() {
  const cookieStore = await cookies();
  return createClient(cookieStore);
}

export async function uploadFileServer(options: UploadOptions): Promise<UploadResult> {
  const supabase = await getSupabaseServerClient();
  const { bucket, path, file, upsert = false, contentType, cacheControl = "3600" } = options;

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert,
    contentType: contentType || file.type,
    cacheControl,
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
    etag: data.etag || undefined,
  };

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: publicUrlData.publicUrl,
    metadata,
  };
}

export async function getSignedUrlServer(options: SignedUrlOptions): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const { bucket, path, expiresIn = 3600, download = false, transform } = options;

  let query = supabase.storage.from(bucket).createSignedUrl(path, expiresIn, {
    download: download ? "attachment" : undefined,
  });

  if (transform) {
    query = query.transform(transform as Record<string, unknown>);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function getPublicUrlServer(bucket: string, path: string): Promise<string> {
  const supabase = await getSupabaseServerClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function listFilesServer(options: ListFilesOptions): Promise<FileListItem[]> {
  const supabase = await getSupabaseServerClient();
  const { bucket, folder = "", limit = 100, offset = 0, sortBy } = options;

  const { data, error } = await supabase.storage.from(bucket).list(folder, {
    limit,
    offset,
    sortBy: sortBy ? { column: sortBy.column, order: sortBy.order } : undefined,
  });

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data || [];
}

export async function deleteFilesServer(options: DeleteOptions): Promise<void> {
  const supabase = await getSupabaseServerClient();
  const { bucket, paths } = options;

  const { error } = await supabase.storage.from(bucket).remove(paths);

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}

export async function moveFileServer(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.storage.from(bucket).move(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to move file: ${error.message}`);
  }
}

export async function copyFileServer(
  bucket: string,
  fromPath: string,
  toPath: string
): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.storage.from(bucket).copy(fromPath, toPath);

  if (error) {
    throw new Error(`Failed to copy file: ${error.message}`);
  }
}

export async function createBucketServer(options: CreateBucketOptions): Promise<BucketInfo> {
  const supabase = await getSupabaseServerClient();
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

export async function getBucketServer(name: string): Promise<BucketInfo | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.storage.getBucket(name);

  if (error) {
    if (error.message.includes("not found")) {
      return null;
    }
    throw new Error(`Failed to get bucket: ${error.message}`);
  }

  return data as BucketInfo;
}

export async function listBucketsServer(): Promise<BucketInfo[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    throw new Error(`Failed to list buckets: ${error.message}`);
  }

  return data as BucketInfo[];
}

export async function updateBucketServer(
  name: string,
  options: Partial<CreateBucketOptions>
): Promise<BucketInfo> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.storage.updateBucket(name, options);

  if (error) {
    throw new Error(`Failed to update bucket: ${error.message}`);
  }

  return data as BucketInfo;
}

export async function deleteBucketServer(name: string): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.storage.deleteBucket(name);

  if (error) {
    throw new Error(`Failed to delete bucket: ${error.message}`);
  }
}

export async function emptyBucketServer(name: string): Promise<void> {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.storage.emptyBucket(name);

  if (error) {
    throw new Error(`Failed to empty bucket: ${error.message}`);
  }
}

export function getImageTransformUrlServer(
  bucket: string,
  path: string,
  transform: ImageTransformOptions
): string {
  const supabase = createClient({} as any);
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