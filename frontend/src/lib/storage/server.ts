import { createClient } from "@/utils/supabase/server-user";
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

import { MAX_SIMPLE_UPLOAD_SIZE, isPublicBucket } from "./upload-policy";

const MAX_FILE_SIZE = MAX_SIMPLE_UPLOAD_SIZE;

async function getSupabaseServerClient() {
  return createClient();
}

export async function uploadFileServer(options: UploadOptions): Promise<UploadResult> {
  const supabase = await getSupabaseServerClient();
  const { bucket, path, file, upsert = false, contentType, cacheControl = "3600" } = options;

  if (!path) {
    throw new Error("Upload path is required for direct server storage uploads");
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }

  let fileToUpload = file;
  if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
    // SECURITY: fail closed. Sanitization must succeed for an SVG to be
    // uploaded at all. Falling back to the original bytes here would
    // re-introduce XSS / script-injection vectors the sanitizer exists
    // to remove.
    let sanitizedText: string;
    try {
      const text = await file.text();
      sanitizedText = sanitizeSvg(text);
    } catch (e) {
      console.warn("SVG sanitization failed on server; rejecting upload", e);
      throw new Error(
        "SVG validation failed: the file could not be safely sanitized and was rejected."
      );
    }

    // DOMPurify returns "" for fully-hostile input rather than throwing.
    // Treat empty output as a rejection: an "SVG" that sanitizes to
    // nothing is not a usable file and silently uploading "" would mask
    // the attack from both the caller and any downstream consumer.
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

  const { data, error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
    upsert,
    contentType: contentType || file.type,
    cacheControl,
  });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // SECURITY: only return a public CDN URL when the bucket is explicitly
  // public. For private buckets (student work, certificates, teacher
  // materials, invoices) we issue a short-lived signed URL — the public
  // URL would otherwise expose every object to anonymous readers at the
  // Supabase edge cache, sidestepping every authorization check on this
  // server.
  let accessibleUrl: string;
  let signedUrl: string | undefined;
  if (isPublicBucket(bucket)) {
    accessibleUrl = supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl;
  } else {
    const { data: signedData, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 3600);
    if (signedErr || !signedData?.signedUrl) {
      throw new Error(
        `Upload succeeded but failed to issue signed URL: ${signedErr?.message ?? "unknown error"}`
      );
    }
    accessibleUrl = signedData.signedUrl;
    signedUrl = signedData.signedUrl;
  }

  const metadata: FileMetadata = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: file.lastModified,
    uploadedAt: new Date().toISOString(),
  };

  return {
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: accessibleUrl,
    signedUrl,
    metadata,
  };
}

export async function getSignedUrlServer(options: SignedUrlOptions): Promise<string> {
  const supabase = await getSupabaseServerClient();
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

export async function getImageTransformUrlServer(
  bucket: string,
  path: string,
  transform: ImageTransformOptions
): Promise<string> {
  // SECURITY: refuse to mint a public CDN URL for a non-public bucket.
  // A transform applied to a private object would still be reachable at
  // the same public edge — same leak shape as getPublicUrlServer().
  if (!isPublicBucket(bucket)) {
    throw new Error(
      `getImageTransformUrlServer is not allowed for bucket "${bucket}": bucket is not public. ` +
      `Use createSignedUrl with a transform for private content.`
    );
  }
  const supabase = await createClient();
  return supabase.storage.from(bucket).getPublicUrl(path, {
    transform: transform as Record<string, unknown>,
  }).data.publicUrl;
}

