export interface UploadOptions {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
  onProgress?: (progress: number) => void;
}

export interface UploadResult {
  path: string;
  fullPath: string;
  publicUrl: string;
  signedUrl?: string;
  metadata: FileMetadata;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  uploadedAt: string;
  etag?: string;
}

export interface SignedUrlOptions {
  bucket: string;
  path: string;
  expiresIn?: number;
  download?: boolean;
  transform?: ImageTransformOptions;
}

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin' | 'webp' | 'avif';
  resize?: 'cover' | 'contain' | 'fill';
}

export interface ListFilesOptions {
  bucket: string;
  folder?: string;
  limit?: number;
  offset?: number;
  sortBy?: { column: 'name' | 'updated_at' | 'created_at' | 'size'; order: 'asc' | 'desc' };
}

export interface FileListItem {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
  size: number;
}

export interface DeleteOptions {
  bucket: string;
  paths: string[];
}

export interface CreateBucketOptions {
  name: string;
  public?: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
}

export interface BucketInfo {
  id: string;
  name: string;
  owner: string;
  created_at: string;
  updated_at: string;
  public: boolean;
  file_size_limit: number;
  allowed_mime_types: string[];
}