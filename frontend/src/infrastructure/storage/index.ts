/**
 * Infrastructure Layer — Storage
 *
 * البنية التحتية للتخزين: رفع الملفات، StorageClient، سياسات الرفع.
 *
 * @canonical `@/infrastructure/storage`
 */

// Storage client operations
export {
  getSupabaseClient,
  uploadFile,
  uploadLargeFile,
  getSignedUrl,
  getPublicUrl,
  MAX_FILE_SIZE,
  MAX_SIMPLE_UPLOAD_SIZE,
  MAX_CHUNKED_UPLOAD_SIZE,
} from "@/lib/storage/client";

// Storage types
export type {
  UploadOptions,
  UploadResult,
  FileMetadata,
  SignedUrlOptions,
  ImageTransformOptions,
  FileListItem,
  DeleteOptions,
} from "@/lib/storage/types";
