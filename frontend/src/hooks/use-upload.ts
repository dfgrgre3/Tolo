"use client";

import { useState, useCallback, useRef } from "react";
import { uploadFile, uploadLargeFile, generateUserPath, validateFileType, validateFileSize, type UploadOptions, type UploadResult, type FileMetadata } from "@/lib/storage";

export interface UseUploadOptions {
  bucket: string;
  folder?: string;
  allowedTypes?: string[];
  maxSize?: number;
  useLargeFileUpload?: boolean;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export interface UseUploadReturn {
  upload: (file: File) => Promise<UploadResult | null>;
  uploadMultiple: (files: File[]) => Promise<UploadResult[]>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  currentFile: File | null;
  reset: () => void;
  cancel: () => void;
}

export function useUpload(options: UseUploadOptions): UseUploadReturn {
  const {
    bucket,
    folder,
    allowedTypes = [],
    maxSize = 100 * 1024 * 1024,
    useLargeFileUpload = true,
    onProgress,
    onSuccess,
    onError,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cancelledRef = useRef(false);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
    setCurrentFile(null);
    cancelledRef.current = false;
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    cancelledRef.current = true;
    setIsUploading(false);
    setProgress(0);
    setCurrentFile(null);
  }, []);

  const handleProgress = useCallback(
    (p: number) => {
      setProgress(p);
      onProgress?.(p);
    },
    [onProgress]
  );

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!validateFileType(file, allowedTypes)) {
        return `File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(", ") || "any"}`;
      }
      if (!validateFileSize(file, maxSize)) {
        return `File size exceeds maximum allowed size of ${maxSize / (1024 * 1024)}MB`;
      }
      return null;
    },
    [allowedTypes, maxSize]
  );

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        const err = new Error(validationError);
        setError(err);
        onError?.(err);
        return null;
      }

      if (cancelledRef.current) {
        cancelledRef.current = false;
        return null;
      }

      abortControllerRef.current = new AbortController();
      setIsUploading(true);
      setProgress(0);
      setError(null);
      setCurrentFile(file);

      try {
        const userId = "anonymous";
        const path = generateUserPath(userId, file.name, folder);

        const uploadOptions: UploadOptions = {
          bucket,
          path,
          file,
          onProgress: handleProgress,
        };

        let result: UploadResult;

        if (useLargeFileUpload && file.size > 25 * 1024 * 1024) {
          result = await uploadLargeFile(uploadOptions);
        } else {
          result = await uploadFile(uploadOptions);
        }

        setProgress(100);
        onSuccess?.(result);
        return result;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return null;
        }
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
        setCurrentFile(null);
      }
    },
    [bucket, folder, useLargeFileUpload, validateFile, handleProgress, onSuccess, onError]
  );

  const uploadMultiple = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const results: UploadResult[] = [];

      for (const file of files) {
        if (cancelledRef.current) break;

        const result = await upload(file);
        if (result) {
          results.push(result);
        }
      }

      return results;
    },
    [upload]
  );

  return {
    upload,
    uploadMultiple,
    isUploading,
    progress,
    error,
    currentFile,
    reset,
    cancel,
  };
}

export interface UseFileManagerOptions {
  bucket: string;
  folder?: string;
}

export interface UseFileManagerReturn {
  listFiles: (options?: { folder?: string; limit?: number; offset?: number }) => Promise<FileMetadata[]>;
  deleteFiles: (paths: string[]) => Promise<void>;
  moveFile: (fromPath: string, toPath: string) => Promise<void>;
  copyFile: (fromPath: string, toPath: string) => Promise<void>;
  getSignedUrl: (path: string, expiresIn?: number) => Promise<string>;
  getPublicUrl: (path: string) => Promise<string>;
  isLoading: boolean;
  error: Error | null;
}

export function useFileManager(options: UseFileManagerOptions): UseFileManagerReturn {
  const { bucket, folder } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const listFiles = useCallback(
    async (listOptions: { folder?: string; limit?: number; offset?: number } = {}) => {
      setIsLoading(true);
      setError(null);

      try {
        const { listFiles: listFilesUtil } = await import("@/lib/storage");
        const files = await listFilesUtil({
          bucket,
          folder: listOptions.folder || folder || "",
          limit: listOptions.limit || 100,
          offset: listOptions.offset || 0,
        });

        return files.map((f) => ({
          name: f.name,
          size: f.size,
          type: f.metadata?.type as string || "",
          lastModified: new Date(f.updated_at).getTime(),
          uploadedAt: f.created_at,
        }));
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to list files");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [bucket, folder]
  );

  const deleteFiles = useCallback(
    async (paths: string[]) => {
      setIsLoading(true);
      setError(null);

      try {
        const { deleteFiles: deleteFilesUtil } = await import("@/lib/storage");
        await deleteFilesUtil({ bucket, paths });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to delete files");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [bucket]
  );

  const moveFile = useCallback(
    async (fromPath: string, toPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { moveFile: moveFileUtil } = await import("@/lib/storage");
        await moveFileUtil(bucket, fromPath, toPath);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to move file");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [bucket]
  );

  const copyFile = useCallback(
    async (fromPath: string, toPath: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { copyFile: copyFileUtil } = await import("@/lib/storage");
        await copyFileUtil(bucket, fromPath, toPath);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to copy file");
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [bucket]
  );

  const getSignedUrl = useCallback(
    async (path: string, expiresIn = 3600) => {
      const { getSignedUrl: getSignedUrlUtil } = await import("@/lib/storage");
      return getSignedUrlUtil({ bucket, path, expiresIn });
    },
    [bucket]
  );

  const getPublicUrl = useCallback(
    async (path: string) => {
      const { getPublicUrl: getPublicUrlUtil } = await import("@/lib/storage");
      return getPublicUrlUtil(bucket, path);
    },
    [bucket]
  );

  return {
    listFiles,
    deleteFiles,
    moveFile,
    copyFile,
    getSignedUrl,
    getPublicUrl,
    isLoading,
    error,
  };
}